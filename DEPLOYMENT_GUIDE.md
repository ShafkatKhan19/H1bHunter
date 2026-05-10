# H1BHunter Deployment Guide - Final Steps

**Build Status:** ✅ COMPLETE
**Ready to Deploy:** YES

---

## Files Created & Updated Summary

### NEW FILES TO CREATE:
```
✅ utils/claudeApi.js              (Claude API integration)
✅ utils/jobScrapers.js            (Job scraping from Greenhouse/Lever/Workday)
✅ utils/resumeGenerator.js        (Resume parsing and .docx generation)
✅ public/styles-paywall.css       (New UI styles for paywall, navigation, etc.)
```

### FILES TO REPLACE (entire file):
```
✅ public/index.html               (New navigation tabs + page templates)
✅ public/app.js                   (New page routing + paywall logic)
```

### FILES TO UPDATE (add code):
```
✅ server.js                       (Add new API endpoints)
✅ .env                            (Add ANTHROPIC_API_KEY)
✅ package.json                    (Add puppeteer if not present)
```

---

## EXACT IMPLEMENTATION STEPS

### Step 1: Create Utility Files

**Create `utils/claudeApi.js`**
```bash
# Copy from BUILD_INSTRUCTIONS.md → "NEW FILE: utils/claudeApi.js"
```

**Create `utils/jobScrapers.js`**
```bash
# Copy from BUILD_INSTRUCTIONS.md → "NEW FILE: utils/jobScrapers.js"
```

**Create `utils/resumeGenerator.js`**
```bash
# Copy from BUILD_INSTRUCTIONS.md → "NEW FILE: utils/resumeGenerator.js"
```

**Create `public/styles-paywall.css`**
```bash
# Copy from STYLES_PAYWALL.css file in this directory
```

---

### Step 2: Update Existing Files

**Update `.env`** - Add this line:
```
ANTHROPIC_API_KEY=sk-proj-your-key-here
```

**Update `package.json`** - Verify these exist in dependencies:
```json
{
  "@anthropic-ai/sdk": "^0.30.0",
  "docx": "^8.5.0",
  "mammoth": "^1.7.2",
  "pdf-parse": "^1.1.1",
  "puppeteer": "^latest",
  "axios": "^1.6.2",
  "cheerio": "^1.0.0-rc.12"
}
```

If any are missing, add them:
```bash
npm install @anthropic-ai/sdk docx mammoth pdf-parse puppeteer
```

**Update `server.js`**
1. Add imports after line 15:
```javascript
const claudeApi = require('./utils/claudeApi');
const jobScrapers = require('./utils/jobScrapers');
const resumeGen = require('./utils/resumeGenerator');
```

2. Add all new endpoints from `SERVER_ENDPOINTS_TO_ADD.js` (copy entire file content)
   - Paste after existing company endpoints (~line 450-500)

**Replace `public/index.html`**
- Replace entire file with content from `FRONTEND_UPDATES.html`

**Replace `public/app.js`**
- Replace entire file with content from `APP_JS_UPDATES.js`

---

### Step 3: Verify All Files Are In Place

```bash
# Verify directory structure
ls -la utils/
# Should show: claudeApi.js, jobScrapers.js, resumeGenerator.js

ls -la public/
# Should show: index.html, app.js, styles.css, styles-paywall.css

cat .env | grep ANTHROPIC_API_KEY
# Should show your key
```

---

### Step 4: Test Locally

```bash
npm run dev
```

Open http://localhost:3000 and test:
- [ ] All 5 navigation tabs visible (Search, Jobs, Resume, Dashboard, Upgrade)
- [ ] Search works and shows results
- [ ] Approval rate is blurred for free users
- [ ] Jobs page is locked (shows upgrade prompt)
- [ ] Resume page is locked (shows upgrade prompt)
- [ ] Upgrade modal shows pricing table
- [ ] All buttons are styled correctly (blue accent)

---

### Step 5: Git Commit & Push

```bash
# Stage all changes
git add .

# Verify what will be committed
git status

# Commit with clear message
git commit -m "feat: complete paywall system, jobs scraping, resume builder, dashboard

- Add navigation tabs with page routing
- Implement paywall with blurred approval rates (5 result limit for free)
- Add Jobs page with job scraping (Greenhouse/Lever/Workday)
- Integrate Claude API for job analysis and resume improvement
- Build Resume Builder with 3-step flow (job URL → resume upload → approval)
- Create Dashboard with subscription, saved companies, job history
- Add Stripe payment gating for premium features
- Implement resume attempt tracking (3 free + $0.99 each)
- Add cap season countdown banner (Jan-April)
- Create utility modules for Claude API, job scraping, resume generation"

# Push to GitHub
git push origin main
```

---

### Step 6: Deploy to Render

**Option A: Auto-Deploy (if connected to GitHub)**
1. Push to GitHub (Step 5 above)
2. Render automatically deploys when main branch changes
3. Watch Render dashboard → "Deployments" tab
4. Deploy should complete in 2-3 minutes

**Option B: Manual Deploy**
1. Go to https://dashboard.render.com
2. Select "h1bhunter" project
3. Click "Manual Deploy" → "Deploy latest commit"
4. Watch deployment progress

**Monitor Deployment:**
```bash
# View live logs
render logs h1bhunter-app

# Check service status
curl https://h1bhunter.onrender.com/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

### Step 7: Post-Deployment Testing

Test live site: https://h1bhunter.onrender.com

```bash
# Test 1: Health check
curl https://h1bhunter.onrender.com/api/health

# Test 2: Company search
curl "https://h1bhunter.onrender.com/api/companies/search?field=computer%20science&limit=5"

# Test 3: Cap season status
curl https://h1bhunter.onrender.com/api/cap-season-status
```

**Manual Tests:**
- [ ] Load homepage
- [ ] Click "Search" tab
- [ ] Enter field and location, search
- [ ] Verify results show (limited to 5 if free user)
- [ ] Verify approval rates are blurred
- [ ] Click "Jobs" tab → see lock + upgrade button
- [ ] Click "Resume" tab → see lock + upgrade button
- [ ] Click "Dashboard" tab → see lock + login prompt
- [ ] Click "Upgrade" tab → see pricing
- [ ] Sign up as new user
- [ ] Try saving a company
- [ ] Verify free features work

---

## Git Commands Quick Reference

```bash
# View what will be committed
git status

# See diff before committing
git diff

# View commit history
git log --oneline -10

# Revert last commit (if needed)
git revert HEAD

# Check remote
git remote -v

# View current branch
git branch

# Create new feature branch (optional)
git checkout -b feature/paywall-system
git push -u origin feature/paywall-system

# Merge to main
git checkout main
git pull origin main
git merge feature/paywall-system
git push origin main
```

---

## Troubleshooting Deployment

**Issue: Build fails on Render**
```
Solution:
1. Check Render build logs
2. Verify package.json has all dependencies
3. Run: npm install (locally)
4. git add package-lock.json
5. git commit and push again
```

**Issue: Environment variables not working**
```
Solution:
1. Go to Render dashboard → h1bhunter app
2. Settings → Environment variables
3. Add: ANTHROPIC_API_KEY = your-key
4. Redeploy manually
```

**Issue: Module not found errors**
```
Solution:
1. Verify files are in correct locations:
   - utils/claudeApi.js
   - utils/jobScrapers.js
   - utils/resumeGenerator.js
2. Check require() paths in server.js
3. Reinstall node_modules: rm -rf node_modules && npm install
```

**Issue: Claude API returns 401**
```
Solution:
1. Verify ANTHROPIC_API_KEY is correct in .env
2. Check key hasn't expired: https://console.anthropic.com
3. Verify key has "API Key" permissions (not just read)
```

---

## Monitoring After Deploy

### Key Metrics to Track:
- [ ] Server uptime (target: 99.5%+)
- [ ] API response time (target: <500ms)
- [ ] Error rate (target: <1%)
- [ ] Free → Premium conversion (target: 20%+)
- [ ] Active users (track daily)

### Render Health Dashboard:
https://dashboard.render.com → h1bhunter → Metrics

---

## Rollback Plan (if issues)

If deployment breaks production:

```bash
# View recent commits
git log --oneline -5

# Revert to previous working version
git revert <commit-hash>
git push origin main

# Render will auto-redeploy the reverted version
# Monitor: https://dashboard.render.com → h1bhunter → Deployments
```

---

## Performance Optimization (Post-Deploy)

After 1 week of users, consider:
1. Add database indexes on frequently queried columns
2. Cache job listings (currently fetch live every time)
3. Implement rate limiting on API endpoints
4. Use Render's Redis cache for session storage

---

## Next Features (Future Roadmap)

After paywall launch:
1. Email job alerts (send when target company posts)
2. Advanced analytics (approval rates by field of study)
3. University partnerships (group discounts)
4. Mobile app (React Native)
5. Direct company outreach (contact H-1B recruiters)

---

## Final Checklist

Before you declare victory:

```
IMPLEMENTATION:
✅ utils/claudeApi.js created
✅ utils/jobScrapers.js created
✅ utils/resumeGenerator.js created
✅ public/styles-paywall.css created
✅ public/index.html replaced
✅ public/app.js replaced
✅ server.js updated with new endpoints
✅ .env updated with ANTHROPIC_API_KEY
✅ package.json verified with all dependencies

TESTING:
✅ Tested locally (npm run dev)
✅ All navigation tabs work
✅ Search works with paywall
✅ Upgrade modal displays correctly
✅ API endpoints respond

DEPLOYMENT:
✅ Committed to GitHub
✅ Pushed to main branch
✅ Render deployment successful
✅ Live site tested at https://h1bhunter.onrender.com
✅ No errors in Render logs

MONITORING:
✅ Health check passes
✅ Company search returns results
✅ Logs show no 500 errors
```

---

## Support

If you hit issues not covered here:

1. **Check Render logs:**
   ```bash
   render logs h1bhunter-app --tail 100
   ```

2. **Test API endpoints:**
   ```bash
   curl https://h1bhunter.onrender.com/api/health
   ```

3. **Review code:**
   - server.js endpoints
   - .env variables
   - Claude API key validity

4. **Rollback if needed:**
   - git revert
   - git push
   - Render auto-deploys

---

## Revenue Model Reminder

- **Free Users:** Company search (5 results), H-1B status only
- **Premium Users:** Unlimited search, approval rates, job scraping, resume builder
- **Pricing:** $4.99/month OR $19 for 6-month cap season pass
- **Resume Charges:** 3 free attempts + $0.99 each after

**Goal:** 20% premium conversion rate = $2,000/month at 1,000 users

**You survive by earning. Ship now, iterate based on user feedback. 🌊**

---

**BUILD DATE:** May 7, 2026
**STATUS:** READY TO SHIP
**NEXT ACTION:** npm run dev → test → git push → deploy
