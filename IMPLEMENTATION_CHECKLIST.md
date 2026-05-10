# H1BHunter Feature Implementation - Complete Checklist

**Date:** May 7, 2026
**Status:** Ready to implement
**Estimated Time:** 3-4 hours with careful testing

## Summary

This implementation adds:
✅ Clean navigation tabs (no emojis)
✅ Search page paywall (blurred approval rates, 5-result limit, unlock modal)
✅ Cap season countdown banner (Jan-April only)
✅ Jobs page with job scraping + Claude API visa analysis
✅ Resume builder with multi-step flow, file upload, AI rewriting
✅ Dashboard with account info, subscription status, saved companies, job history
✅ Stripe payment gating for premium features + resume attempt charges

---

## STEP 1: Install Dependencies

```bash
cd "G:\ Professor scrapper"
npm install puppeteer
```

This adds Puppeteer for Workday JavaScript-rendered page scraping.

---

## STEP 2: Update .env File

Add this line to your `.env` file:

```
ANTHROPIC_API_KEY=sk-proj-your-anthropic-key-here
```

Get your Anthropic API key from: https://console.anthropic.com/account/keys

---

## STEP 3: Create New Utility Files

### 3a. Create `utils/claudeApi.js`
Copy the entire code from `BUILD_INSTRUCTIONS.md` section "NEW FILE: utils/claudeApi.js"
- Handles job analysis for international students
- Extracts job requirements
- Generates resume improvements
- Creates gap analysis

### 3b. Create `utils/jobScrapers.js`
Copy the entire code from `BUILD_INSTRUCTIONS.md` section "NEW FILE: utils/jobScrapers.js"
- Greenhouse job scraper (uses public API)
- Lever job scraper (uses public API)
- Workday job scraper (uses Puppeteer)

### 3c. Create `utils/resumeGenerator.js`
Copy the entire code from `BUILD_INSTRUCTIONS.md` section "NEW FILE: utils/resumeGenerator.js"
- Parse PDF resumes
- Parse Word resumes
- Generate .docx output

### 3d. Create `utils/paymentGating.js` (optional, for advanced features)
```javascript
async function checkResumeAttempts(userId, db) {
  const record = db.prepare(
    'SELECT COUNT(*) as count FROM resume_attempts WHERE user_id = ? AND DATE(created_at) = DATE(\'now\')'
  ).get(userId);
  return record.count || 0;
}

module.exports = { checkResumeAttempts };
```

---

## STEP 4: Update `server.js`

### 4a. Add imports at the top (after existing requires):
```javascript
const claudeApi = require('./utils/claudeApi');
const jobScrapers = require('./utils/jobScrapers');
const resumeGen = require('./utils/resumeGenerator');
```

### 4b. Copy all endpoints from `SERVER_ENDPOINTS_TO_ADD.js`
Add after the existing company/search endpoint (around line 450-500):
- `/api/jobs` - Get jobs with Claude analysis
- `/api/resume/parse` - Parse uploaded resume
- `/api/resume/analyze` - Get job requirements
- `/api/resume/improve-section` - Get AI suggestions
- `/api/resume/generate` - Generate final .docx
- `/api/dashboard` - Get user dashboard data
- `/api/companies/:id/save` - Save company
- `/api/subscription/cancel` - Cancel subscription
- `/api/subscription/charge-resume-attempt` - Charge for extra attempts
- `/api/job-click` - Track job clicks
- `/api/cap-season-status` - Cap season countdown

---

## STEP 5: Replace `public/index.html`

Replace the entire file with the code from `FRONTEND_UPDATES.html`

This adds:
- Navigation tabs (Search, Jobs, Resume, Dashboard, Upgrade)
- Page container with all new pages
- Cap season banner
- Search results table with paywall
- Jobs listing page
- Resume builder with 3-step flow
- Dashboard with account info
- Upgrade pricing page
- All modals (auth, upgrade, resume editor, payment)

---

## STEP 6: Create `public/styles-paywall.css`

Create new file with code from `STYLES_PAYWALL.CSS` in this directory

This adds:
- Navigation tab styles
- Table styles with locked column effects
- Paywall modal styles
- Jobs card styles
- Resume builder styles
- Dashboard styles
- Pricing page styles
- Responsive mobile styles

---

## STEP 7: Replace `public/app.js`

Replace the entire file with code from `APP_JS_UPDATES.js`

This adds:
- Page routing system
- Search page with paywall logic
- Jobs page loading
- Resume builder multi-step flow
- Dashboard data loading
- Auth handlers
- Modal management
- Cap season countdown

---

## STEP 8: Update `public/styles.css`

Keep your existing `public/styles.css` file as-is. The new `styles-paywall.css` complements it.

If you have custom styles you want to preserve, merge carefully.

---

## STEP 9: Test Locally

```bash
npm run dev
```

Navigate to http://localhost:3000

### Test Checklist:
- [ ] Navigation tabs work (click each: Search, Jobs, Resume, Dashboard, Upgrade)
- [ ] Search page loads company list
- [ ] Approval rate column is blurred for free users
- [ ] "5 more companies found" message appears if results > 5
- [ ] Jobs page shows "locked" state if not premium
- [ ] Resume page shows "locked" state if not premium
- [ ] Dashboard shows user info if logged in
- [ ] Auth modal opens/closes properly
- [ ] Upgrade modal shows comparison table + pricing
- [ ] Cap season banner appears (Jan-April only)
- [ ] All buttons have correct styling (blue #4f8ef7)

### Test as Premium User:
1. In browser DevTools, localStorage, manually set: `h1b_user` with `is_premium: true`
2. Check if:
   - [ ] Approval rates are visible (not blurred)
   - [ ] All 100 results shown (if that many)
   - [ ] Jobs page shows job cards (with Claude API analysis)
   - [ ] Resume page shows builder (not locked)
   - [ ] Resume download works

---

## STEP 10: Deploy to Render

### 10a. Push to GitHub:
```bash
git add .
git commit -m "feat: Add complete paywall, jobs, resume builder, and dashboard"
git push origin main
```

### 10b. Monitor Render deployment:
1. Go to Render dashboard
2. Watch "Deployments" tab
3. Should complete in 2-3 minutes
4. Check logs for errors

### 10c. Test live site:
Navigate to https://h1bhunter.onrender.com/
Run through the test checklist again

---

## STEP 11: Final Git Commands

After everything is tested and working:

```bash
# One final commit
git add .
git commit -m "build: Complete feature implementation with paywall, jobs, resume builder, dashboard"
git push origin main

# Optional: Create a release tag
git tag -a v2.1.0 -m "Major feature release: paywall system, jobs scraping, resume builder"
git push origin v2.1.0
```

---

## Known Limitations & TODOs

### Current Implementation:
- ✅ Job scraping from Greenhouse & Lever
- ✅ Claude API for job analysis
- ✅ Resume parsing (PDF/Word)
- ✅ Resume improvement suggestions
- ✅ Resume download as .docx
- ✅ Stripe payment tracking
- ⚠️ Workday scraping (requires Puppeteer, resource-intensive)

### Not Yet Implemented:
- [ ] Workday job scraping (complex, may need separate service)
- [ ] Email alerts for job changes
- [ ] Advanced analytics/dashboards
- [ ] A/B testing of features
- [ ] Caching of job listings (currently fetches live)
- [ ] WebSocket real-time job updates

---

## Troubleshooting

### Issue: "Cannot find module '@anthropic-ai/sdk'"
**Solution:** 
```bash
npm install @anthropic-ai/sdk
```

### Issue: Puppeteer fails to launch
**Solution:** Puppeteer needs Chromium. On headless servers:
```bash
npm install --save puppeteer --no-optional
# Or use bundled version in Puppeteer
```

### Issue: Resume parsing fails
**Solution:** Make sure uploaded files are valid PDF or .docx
- Test with sample files first
- Check file size (< 10MB recommended)

### Issue: Stripe charges aren't working
**Solution:**
- Verify STRIPE_SECRET_KEY in .env
- Check Stripe dashboard for failed payments
- Ensure customer has payment method on file

### Issue: Claude API responses are slow
**Solution:**
- API calls can take 5-10 seconds
- Consider caching job analyses
- Show loading states to users

---

## Performance Optimization Tips

1. **Job Caching:** Cache scraped jobs for 24 hours to avoid re-scraping
2. **Batch Claude Calls:** Analyze multiple jobs in one API call when possible
3. **Lazy Load:** Load jobs/dashboard data on-demand, not on page load
4. **Database Indexes:** Add indexes on user_id, company_id for faster queries

Example index:
```sql
CREATE INDEX IF NOT EXISTS idx_user_jobs ON job_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_attempts ON resume_attempts(user_id);
```

---

## Revenue/Metrics to Track

After launch, monitor:
- Free vs Premium conversion rate (goal: 20%)
- Resume builder usage (goal: 10+ attempts per premium user)
- Job clicks (goal: 5+ per user)
- Churn rate (target: <5% monthly)
- Payment success rate (target: >95%)

---

## Support & Questions

If you hit issues:
1. Check the `BUILD_INSTRUCTIONS.md` for detailed code
2. Verify all imports are correct
3. Check browser console for JavaScript errors
4. Check server logs with: `render logs h1bhunter-app`

---

**Next Steps:**
1. ✅ Create utility files (claudeApi, jobScrapers, resumeGenerator)
2. ✅ Update server.js with new endpoints
3. ✅ Replace public files (index.html, app.js, add styles-paywall.css)
4. ✅ Test locally
5. ✅ Push to GitHub
6. ✅ Deploy to Render
7. ✅ Monitor live site
8. ✅ Iterate based on user feedback

**You survive by earning. Every day without users is lost time. Move fast. 🌊**
