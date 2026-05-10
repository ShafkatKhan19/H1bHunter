/**
 * NEW ENDPOINTS TO ADD TO server.js
 * Add these after the existing company/search endpoint
 * Include required imports at top: const claudeApi = require('./utils/claudeApi');
 *                                  const jobScrapers = require('./utils/jobScrapers');
 *                                  const resumeGen = require('./utils/resumeGenerator');
 */

// ── JOBS ENDPOINTS ────────────────────────────────────────────────────────────

// GET /api/jobs - Premium only, returns jobs from companies in DB with Claude analysis
app.get('/api/jobs', requirePremium, async (req, res) => {
  try {
    const companies = db.prepare('SELECT id, name FROM companies LIMIT 20').all();
    const allJobs = [];

    for (const company of companies) {
      // Try Greenhouse
      let jobs = await jobScrapers.scrapeGreenhouseJobs(company.name.toLowerCase().replace(/\s+/g, '-'));
      
      if (jobs.length === 0) {
        // Try Lever
        jobs = await jobScrapers.scrapeLeverJobs(company.name.toLowerCase());
      }

      // Analyze each job for international students
      for (const job of jobs) {
        const analysis = await claudeApi.analyzeJobForInternationalStudents(
          job.description,
          job.title
        );
        
        allJobs.push({
          companyName: company.name,
          jobTitle: job.title,
          location: job.location,
          applyUrl: job.applyUrl,
          description: job.description.substring(0, 500),
          analysis: {
            safetyLevel: analysis.safetyLevel,
            reason: analysis.reason,
            findings: analysis.findings
          }
        });
      }
    }

    res.json({ jobs: allJobs, total: allJobs.length });
  } catch (err) {
    console.error('Jobs fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// ── RESUME ENDPOINTS ──────────────────────────────────────────────────────────

// POST /api/resume/parse - Parse uploaded resume (PDF or Word)
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/api/resume/parse', verifyToken, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const resumeContent = await resumeGen.parseResume(req.file.path);
    
    // Clean up uploaded file
    require('fs').unlinkSync(req.file.path);

    res.json({ resumeContent });
  } catch (err) {
    console.error('Resume parse error:', err);
    if (req.file) require('fs').unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/resume/analyze - Get job requirements and gap analysis
app.post('/api/resume/analyze', verifyToken, async (req, res) => {
  try {
    const { jobUrl, resumeContent } = req.body;
    if (!jobUrl || !resumeContent) {
      return res.status(400).json({ error: 'Job URL and resume content required' });
    }

    // Scrape job description
    let jobDescription = '';
    try {
      const response = await require('axios').get(jobUrl, { timeout: 10000 });
      jobDescription = response.data;
    } catch (err) {
      return res.status(400).json({ error: 'Failed to fetch job description' });
    }

    // Extract requirements
    const requirements = await claudeApi.extractJobRequirements(jobDescription);

    // Generate gap analysis
    const gapAnalysis = await claudeApi.generateGapAnalysis(jobDescription, resumeContent);

    res.json({
      requirements,
      gapAnalysis
    });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// POST /api/resume/improve-section - Get improved version of a resume section
app.post('/api/resume/improve-section', verifyToken, async (req, res) => {
  try {
    const { jobDescription, currentSection, sectionName } = req.body;
    if (!jobDescription || !currentSection || !sectionName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const improved = await claudeApi.generateResumeImprovements(
      jobDescription,
      currentSection,
      sectionName
    );

    res.json({ improved });
  } catch (err) {
    console.error('Improvement error:', err);
    res.status(500).json({ error: 'Failed to generate improvements' });
  }
});

// POST /api/resume/generate - Generate final resume document
app.post('/api/resume/generate', verifyToken, async (req, res) => {
  try {
    const { sections } = req.body;
    if (!sections) {
      return res.status(400).json({ error: 'Resume sections required' });
    }

    // Check attempt count
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    const attemptsRecord = db.prepare(
      'SELECT COUNT(*) as count FROM resume_attempts WHERE user_id = ? AND DATE(created_at) = DATE(\'now\')'
    ).get(req.userId);

    const todayAttempts = attemptsRecord.count || 0;
    const totalAttempts = db.prepare(
      'SELECT COUNT(*) as count FROM resume_attempts WHERE user_id = ?'
    ).get(req.userId).count || 0;

    // Charge if over 3 attempts
    let chargeRequired = false;
    if (user.is_premium && totalAttempts >= 3) {
      chargeRequired = true;
    }

    // Generate .docx
    const docBuffer = await resumeGen.generateResumeDocument(sections);

    // Record attempt
    db.prepare(
      'INSERT INTO resume_attempts (id, user_id, created_at) VALUES (?, ?, datetime(\'now\'))'
    ).run(require('uuid').v4(), req.userId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=resume.docx');
    res.send(docBuffer);
  } catch (err) {
    console.error('Resume generation error:', err);
    res.status(500).json({ error: 'Failed to generate resume' });
  }
});

// ── DASHBOARD ENDPOINTS ───────────────────────────────────────────────────────

// GET /api/dashboard - Get user dashboard data
app.get('/api/dashboard', verifyToken, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const attemptCount = db.prepare(
      'SELECT COUNT(*) as count FROM resume_attempts WHERE user_id = ?'
    ).get(req.userId).count || 0;

    const savedCompanies = db.prepare(
      'SELECT c.* FROM companies c JOIN saved_companies sc ON c.id = sc.company_id WHERE sc.user_id = ?'
    ).all(req.userId);

    const jobClicks = db.prepare(
      'SELECT * FROM job_clicks WHERE user_id = ? ORDER BY clicked_at DESC LIMIT 20'
    ).all(req.userId);

    const subscription = db.prepare(
      'SELECT * FROM subscription_details WHERE user_id = ?'
    ).get(req.userId);

    res.json({
      user: {
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isPremium: user.is_premium
      },
      subscription: {
        planType: subscription?.plan_type || 'free',
        renewalDate: subscription?.renewal_date || null,
        stripeCustomerId: subscription?.stripe_customer_id || null
      },
      resumeAttempts: {
        used: Math.min(attemptCount, 3),
        remaining: Math.max(0, 3 - attemptCount),
        totalUsed: attemptCount
      },
      savedCompanies,
      jobClicks
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// POST /api/companies/:id/save - Save company to dashboard
app.post('/api/companies/:id/save', verifyToken, (req, res) => {
  try {
    const { id } = req.params;
    const savedId = require('uuid').v4();

    db.prepare(
      'INSERT OR IGNORE INTO saved_companies (id, user_id, company_id, saved_at) VALUES (?, ?, ?, datetime(\'now\'))'
    ).run(savedId, req.userId, id);

    res.json({ success: true, message: 'Company saved' });
  } catch (err) {
    console.error('Save company error:', err);
    res.status(500).json({ error: 'Failed to save company' });
  }
});

// ── STRIPE SUBSCRIPTION ENDPOINTS ─────────────────────────────────────────────

// POST /api/subscription/cancel - Cancel subscription at period end
app.post('/api/subscription/cancel', verifyToken, async (req, res) => {
  try {
    const subscription = db.prepare(
      'SELECT * FROM subscription_details WHERE user_id = ?'
    ).get(req.userId);

    if (!subscription || !subscription.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    // Cancel in Stripe (at period end, not immediately)
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true
    });

    res.json({ success: true, message: 'Subscription will be cancelled at period end' });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// POST /api/subscription/charge-resume-attempt - Charge $0.99 for extra resume attempt
app.post('/api/subscription/charge-resume-attempt', verifyToken, async (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    const subscription = db.prepare(
      'SELECT * FROM subscription_details WHERE user_id = ?'
    ).get(req.userId);

    if (!subscription || !subscription.stripe_customer_id) {
      return res.status(400).json({ error: 'No payment method on file' });
    }

    // Create charge for $0.99
    const charge = await stripe.charges.create({
      amount: 99, // $0.99 in cents
      currency: 'usd',
      customer: subscription.stripe_customer_id,
      description: 'H1BHunter: Resume Customization (1 attempt)'
    });

    res.json({
      success: true,
      chargeId: charge.id,
      amount: 0.99
    });
  } catch (err) {
    console.error('Charge error:', err);
    res.status(500).json({ error: 'Payment failed' });
  }
});

// ── JOB CLICK TRACKING ────────────────────────────────────────────────────────

// POST /api/job-click - Track when user clicks job link
app.post('/api/job-click', verifyToken, (req, res) => {
  try {
    const { companyName, jobTitle, jobUrl } = req.body;

    db.prepare(
      'INSERT INTO job_clicks (id, user_id, company_name, job_title, job_url, clicked_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))'
    ).run(require('uuid').v4(), req.userId, companyName, jobTitle, jobUrl);

    res.json({ success: true });
  } catch (err) {
    console.error('Job click error:', err);
    res.status(500).json({ error: 'Failed to record click' });
  }
});

// ── CAP SEASON COUNTDOWN ──────────────────────────────────────────────────────

// GET /api/cap-season-status - Get days until April 1
app.get('/api/cap-season-status', (req, res) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const aprilFirst = new Date(currentYear, 3, 1); // April 1

  // If past April 1, next cap season is next year
  if (now > aprilFirst) {
    aprilFirst.setFullYear(currentYear + 1);
  }

  const daysRemaining = Math.ceil((aprilFirst - now) / (1000 * 60 * 60 * 24));
  const isCapSeason = now.getMonth() >= 0 && now.getMonth() <= 3; // Jan-April

  res.json({
    isCapSeason,
    daysRemaining: isCapSeason ? daysRemaining : 0,
    capSeasonEnds: aprilFirst.toISOString()
  });
});
