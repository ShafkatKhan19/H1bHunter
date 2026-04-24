# 🌊 H1BHunter & OPTGuard

**Find Companies That Will Sponsor Your H-1B Visa**

H1BHunter is an autonomous revenue-generating web application that helps international students find H-1B visa sponsoring companies, track OPT deadlines, and get daily job alerts. Built by Poseidon for Shafkat Khan.

## Features

### H1BHunter
- 🏢 **Company Search**: Find H-1B sponsoring companies by field of study and location
- ⭐ **Trust Scores**: Rate companies 1-10 based on petition volume, approval rate, green card sponsorship
- 💼 **Job Alerts**: Free users get 1 daily alert; premium users get unlimited
- 📊 **Live Data**: Company approval rates, average salaries, denial rates, wage levels
- 🔐 **User Dashboard**: Save companies, track applications, view weekly reports
- 💳 **Premium Tier**: $9/month for unlimited alerts and priority support

### OPTGuard
- ⏱️ **OPT Countdown**: Track your 90-day unemployment window with visual countdown timer
- 🎯 **Critical Alerts**: Day 60, 75, 85, and 90 emergency notifications
- 📅 **Visa Timeline**: Interactive milestone tracker for H-1B lottery and start dates
- 🔍 **STEM Checker**: Determine eligibility for STEM OPT extension
- 📧 **DSO Helper**: Draft emails to your Designated School Official
- 💳 **Premium Tier**: $3/month for real-time tracking and alerts
- **Bundle**: $10/month for both H1BHunter + OPTGuard

## Tech Stack

**Backend:**
- Node.js + Express.js
- SQLite database (persistent on Railway)
- JWT authentication
- Gmail SMTP for email (free)
- Stripe for payments
- Cheerio + Axios for web scraping

**Frontend:**
- Vanilla HTML/CSS/JavaScript (no frameworks for speed)
- Dark theme with electric blue accents
- Mobile-responsive design
- Real-time data updates

**Deployment:**
- Railway.app (free tier with public URL)
- Cron jobs for daily scraping (3am) and email alerts (8am)
- 6-hour status reports
- Automatic scaling and backups

## Quick Start - Local Development

### Prerequisites
- Node.js 18+ installed
- npm/yarn package manager
- Gmail account (for email alerts)

### Installation

```bash
# Clone or create project directory
cd H1BHunter

# Install dependencies
npm install

# Create data directory
mkdir -p data logs

# Copy environment template
cp .env.example .env

# Edit .env with your values:
# - EMAIL_USER: your Gmail address
# - EMAIL_PASS: Gmail app password (see step 5 below)
# - STRIPE_SECRET_KEY: Stripe test key
# - STRIPE_PRICE_ID: Stripe price ID
# - JWT_SECRET: random secret key
nano .env
```

### Run Locally

```bash
# Start main server
npm start

# In another terminal, run scheduler (optional for dev)
node scripts/cron.js --initial

# Or manually run individual jobs:
node scripts/scrape.js        # Scrape company data
node scripts/sendEmails.js    # Send job alerts
node scripts/monitor.js       # Generate status report
```

Visit `http://localhost:3000` in your browser.

## Deploy to Railway.app (FREE ✨)

Railway gives you a free public URL, free database storage, and automatic deployments. No credit card needed.

### Step 1: Push Code to GitHub

```bash
# Initialize git repo
git init
git add .
git commit -m "Initial H1BHunter build"

# Create a GitHub repo (github.com/new)
# Then add remote and push
git remote add origin https://github.com/YOUR_USERNAME/h1bhunter.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Railway

1. Go to **railway.app** and click "Start New Project"
2. Click "Deploy from GitHub repo"
3. Select your H1BHunter repository
4. Railway auto-detects Node.js and deploys automatically (⏳ 2-3 minutes)
5. Go to **Settings → Domains** and click "Generate Domain"
6. Your app is now live at `https://h1bhunter-abc123.railway.app`

### Step 3: Configure Environment Variables on Railway

In Railway dashboard, go to **Variables** tab and add:

```
JWT_SECRET=your-super-secret-key-here
NODE_ENV=production

EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password

STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PRICE_ID=price_your_h1bhunter_monthly_id
```

### Step 4: Set Up Stripe (Free Account)

1. Go to **stripe.com** → Sign up free
2. Go to **Products** → Create a new product
   - Name: "H1BHunter Premium"
   - Price: $9.00/month (recurring)
   - Copy the **Price ID** (starts with `price_`)
3. Go to **Developers** → **API Keys** → Copy **Secret Key** (starts with `sk_live_`)
4. Add both to Railway Variables:
   - `STRIPE_SECRET_KEY` = your secret key
   - `STRIPE_PRICE_ID` = your price ID

### Step 5: Set Up Gmail for Email Alerts (Free)

1. Go to **Google Account** (myaccount.google.com)
2. Click **Security** (left sidebar)
3. Enable **2-Step Verification** if not already enabled
4. Go to **App passwords** (search for it at the top)
5. Select "Mail" and "Windows Computer" (or your device)
6. Google generates a 16-character app password
7. Add to Railway Variables:
   - `EMAIL_USER` = your Gmail address (e.g., you@gmail.com)
   - `EMAIL_PASS` = the 16-character app password

That's it! Your app is now live with email alerts and payments configured.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- Returns JWT token for authenticated requests

### Companies
- `GET /api/companies/search?field=...&location=...` - Search companies
- `GET /api/companies/:id` - Company details with recent jobs

### Job Alerts
- `POST /api/alerts` - Create alert (requires auth)
- `GET /api/alerts` - List user's alerts (requires auth)

### OPTGuard
- `POST /api/optguard` - Create OPT tracker
- `GET /api/optguard` - Get tracker status

### Saved Companies
- `POST /api/companies/:id/save` - Save company (requires auth)
- `GET /api/saved-companies` - Get saved companies (requires auth)

### Payments (Stripe)
- `POST /api/stripe/checkout` - Create checkout session for premium
- `POST /api/stripe/webhook` - Handle Stripe webhooks

### Health Check
- `GET /health` - Returns `{ status: "ok", timestamp: ... }`

## How to Get First Users

### Reddit (Free & Effective)
1. **r/f1visa** - Post: "I built a free tool that tells you exactly how many OPT unemployment days you have left"
2. **r/internationalstudents** - Post: "A friend violated OPT status on day 91 without knowing. Here's the tool that would have saved them"

Include your Railway URL in comments.

### Facebook Groups
- International student groups at major universities
- F-1 visa groups
- H-1B visa forums

### University Partnerships
- Email international student offices at 10 universities
- Offer free premium access for their students in exchange for email list
- High-conversion channel (students trust their DSO)

### Email + Twitter
- Share user testimonials
- Post about visa deadline milestones (H-1B lottery opens March 1, etc.)
- Tag relevant accounts (@USCIS, immigration law accounts)

## Revenue Model

### Pricing
- **H1BHunter Free**: 1 daily alert, company search, basic info
- **H1BHunter Premium**: $9/month - unlimited alerts, saved companies, weekly reports
- **OPTGuard Free**: One-time calculator, no tracking
- **OPTGuard Premium**: $3/month - real-time countdown, all alerts, DSO helper
- **Bundle**: $10/month (both tools, save $2)

### Unit Economics
- Assume 1,000 registered users
- 20% premium conversion = 200 premium users
- 10% OPTGuard premium = 10 users at $3
- **Monthly Revenue**: (200 × $9) + (10 × $3) = **$1,830/month**

### Checkpoint
When monthly revenue hits **$150**, Poseidon will spawn a child agent to build the Bangla-to-English academic writing polisher.

## Database Schema

**users** - Registration, login, subscription status, premium tier
**companies** - H-1B employer master data with trust scores
**job_alerts** - User alert preferences (field, location)
**job_listings** - Individual job postings with salary ranges
**opt_tracker** - OPT countdown timers per user
**saved_companies** - User's favorite companies

## Monitoring & Logs

**View real-time logs on Railway:**
```bash
# In Railway dashboard → Deployments → View Logs
# Or use Railway CLI:
railway logs
```

**Health status:**
- Visit `https://your-app.railway.app/health`
- Should return: `{ "status": "ok", "timestamp": "..." }`

**Database queries (local development):**
```bash
sqlite3 data/h1bhunter.db
sqlite> SELECT COUNT(*) FROM users;
sqlite> SELECT COUNT(*) FROM companies;
```

## Troubleshooting

### Email alerts not working
- Check `EMAIL_USER` and `EMAIL_PASS` in Railway Variables
- Verify Gmail app password (not your Gmail password)
- Check Railway logs: `railway logs | grep -i email`

### Stripe checkout failing
- Verify `STRIPE_SECRET_KEY` starts with `sk_` (not `pk_`)
- Verify `STRIPE_PRICE_ID` starts with `price_`
- Check browser console for 422 or 400 errors

### Database errors on Railway
- Railway automatically creates `/data` directory
- Check that `DB_PATH=./data/h1bhunter.db` is in Railway Variables
- Railway persists data between deploys ✅

### Cron jobs not running
- Email alerts only run if `EMAIL_USER` and `EMAIL_PASS` are set
- Check Railway logs for `node-cron` messages
- In test: `node scripts/cron.js --initial` locally

## Next Steps

1. **Get 100 users** (target 30 days)
   - Post on Reddit, Facebook groups, universities
   - Ask users for referrals
   - Email list growth target: 10-20/day

2. **Achieve $150/month revenue** (target 60 days)
   - 20% premium conversion = 150 premium users
   - Focus on retention: improve matching, add features users ask for

3. **Spawn OPTGuard builder** (triggered at $150/month)
   - Poseidon spawns child agent to build Bangla-to-English writing tool
   - Cross-promote within H1BHunter to existing users

4. **Scale to 1,000 users, $2,000/month**
   - University partnerships
   - Content marketing (blog, video guides)
   - Community building (Discord)

## Support & Contributing

Report issues via:
- GitHub Issues (create repo first)
- Direct message to creator

## Attribution

Built with ❤️ by **Poseidon** for **Shafkat Khan** (@Shafkat_k)

---

**Remember:** International students face visa deadlines. Every delay costs them their career. Ship fast. Iterate on user feedback. 🚀

