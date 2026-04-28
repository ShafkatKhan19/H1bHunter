#!/usr/bin/env node

/**
 * H1BHunter & OPTGuard - Main Server
 * Build fast, deploy fast, earn fast.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { v4: uuid } = require('uuid');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create data directory if it doesn't exist (Railway persistent storage)
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database (Railway will persist this automatically)
const dbPath = path.join(dataDir, 'h1bhunter.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      field_of_study TEXT,
      target_location TEXT,
      is_premium BOOLEAN DEFAULT 0,
      subscription_active_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Companies table
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      industry TEXT,
      h1b_petitions_filed INTEGER,
      approval_rate REAL,
      denial_rate REAL,
      average_salary INTEGER,
      trust_score INTEGER,
      sponsors_green_cards BOOLEAN,
      wage_level TEXT,
      last_updated DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── AUTO-SEED H-1B COMPANIES ──────────────────────────────
  const companyCount = db.prepare('SELECT COUNT(*) as count FROM companies').get();
  if (companyCount.count === 0) {
    console.log('🌱 Seeding H-1B company database...');
    const H1B_COMPANIES = [
      { name: "Amazon", industry: "Technology", h1b_petitions_filed: 9265, approval_rate: 94, denial_rate: 6, average_salary: 165000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Google", industry: "Technology", h1b_petitions_filed: 7842, approval_rate: 96, denial_rate: 4, average_salary: 185000, trust_score: 10, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Microsoft", industry: "Technology", h1b_petitions_filed: 7123, approval_rate: 95, denial_rate: 5, average_salary: 172000, trust_score: 10, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Meta", industry: "Technology", h1b_petitions_filed: 4521, approval_rate: 93, denial_rate: 7, average_salary: 178000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Apple", industry: "Technology", h1b_petitions_filed: 3892, approval_rate: 95, denial_rate: 5, average_salary: 175000, trust_score: 10, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Infosys", industry: "IT Consulting", h1b_petitions_filed: 31000, approval_rate: 88, denial_rate: 12, average_salary: 95000, trust_score: 8, sponsors_green_cards: 0, wage_level: "Level I-II" },
      { name: "Tata Consultancy Services", industry: "IT Consulting", h1b_petitions_filed: 19500, approval_rate: 87, denial_rate: 13, average_salary: 92000, trust_score: 8, sponsors_green_cards: 0, wage_level: "Level I-II" },
      { name: "Wipro", industry: "IT Consulting", h1b_petitions_filed: 14200, approval_rate: 86, denial_rate: 14, average_salary: 90000, trust_score: 8, sponsors_green_cards: 0, wage_level: "Level I-II" },
      { name: "Cognizant", industry: "IT Consulting", h1b_petitions_filed: 12400, approval_rate: 88, denial_rate: 12, average_salary: 98000, trust_score: 8, sponsors_green_cards: 0, wage_level: "Level I-II" },
      { name: "HCL Technologies", industry: "IT Consulting", h1b_petitions_filed: 8900, approval_rate: 87, denial_rate: 13, average_salary: 93000, trust_score: 8, sponsors_green_cards: 0, wage_level: "Level I-II" },
      { name: "Accenture", industry: "IT Consulting", h1b_petitions_filed: 6800, approval_rate: 91, denial_rate: 9, average_salary: 115000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level II-III" },
      { name: "IBM", industry: "Technology", h1b_petitions_filed: 5200, approval_rate: 92, denial_rate: 8, average_salary: 125000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level II-III" },
      { name: "Capgemini", industry: "IT Consulting", h1b_petitions_filed: 5600, approval_rate: 89, denial_rate: 11, average_salary: 105000, trust_score: 8, sponsors_green_cards: 0, wage_level: "Level II-III" },
      { name: "Deloitte", industry: "Consulting", h1b_petitions_filed: 4100, approval_rate: 93, denial_rate: 7, average_salary: 130000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level II-III" },
      { name: "JPMorgan Chase", industry: "Finance", h1b_petitions_filed: 3200, approval_rate: 94, denial_rate: 6, average_salary: 145000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Goldman Sachs", industry: "Finance", h1b_petitions_filed: 2800, approval_rate: 95, denial_rate: 5, average_salary: 160000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Morgan Stanley", industry: "Finance", h1b_petitions_filed: 2400, approval_rate: 94, denial_rate: 6, average_salary: 155000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Citigroup", industry: "Finance", h1b_petitions_filed: 2100, approval_rate: 92, denial_rate: 8, average_salary: 135000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level II-III" },
      { name: "Bank of America", industry: "Finance", h1b_petitions_filed: 1900, approval_rate: 93, denial_rate: 7, average_salary: 130000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level II-III" },
      { name: "Nvidia", industry: "Technology", h1b_petitions_filed: 3100, approval_rate: 96, denial_rate: 4, average_salary: 195000, trust_score: 10, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Intel", industry: "Technology", h1b_petitions_filed: 2800, approval_rate: 94, denial_rate: 6, average_salary: 155000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Salesforce", industry: "Technology", h1b_petitions_filed: 2400, approval_rate: 94, denial_rate: 6, average_salary: 158000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Oracle", industry: "Technology", h1b_petitions_filed: 3500, approval_rate: 91, denial_rate: 9, average_salary: 145000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level II-III" },
      { name: "Qualcomm", industry: "Technology", h1b_petitions_filed: 2100, approval_rate: 95, denial_rate: 5, average_salary: 162000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Adobe", industry: "Technology", h1b_petitions_filed: 1800, approval_rate: 95, denial_rate: 5, average_salary: 165000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Cisco", industry: "Technology", h1b_petitions_filed: 2600, approval_rate: 93, denial_rate: 7, average_salary: 148000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level II-III" },
      { name: "Johnson & Johnson", industry: "Healthcare", h1b_petitions_filed: 1800, approval_rate: 94, denial_rate: 6, average_salary: 135000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level II-III" },
      { name: "Pfizer", industry: "Pharma", h1b_petitions_filed: 1650, approval_rate: 95, denial_rate: 5, average_salary: 140000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Merck", industry: "Pharma", h1b_petitions_filed: 1420, approval_rate: 95, denial_rate: 5, average_salary: 145000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Tesla", industry: "Automotive/Tech", h1b_petitions_filed: 2100, approval_rate: 92, denial_rate: 8, average_salary: 152000, trust_score: 9, sponsors_green_cards: 0, wage_level: "Level II-III" },
      { name: "Boeing", industry: "Aerospace", h1b_petitions_filed: 2400, approval_rate: 92, denial_rate: 8, average_salary: 128000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level II-III" },
      { name: "SpaceX", industry: "Aerospace", h1b_petitions_filed: 980, approval_rate: 93, denial_rate: 7, average_salary: 145000, trust_score: 9, sponsors_green_cards: 0, wage_level: "Level II-III" },
      { name: "Netflix", industry: "Technology", h1b_petitions_filed: 980, approval_rate: 95, denial_rate: 5, average_salary: 280000, trust_score: 10, sponsors_green_cards: 1, wage_level: "Level IV" },
      { name: "Uber", industry: "Technology", h1b_petitions_filed: 1200, approval_rate: 93, denial_rate: 7, average_salary: 172000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "LinkedIn", industry: "Technology", h1b_petitions_filed: 1400, approval_rate: 94, denial_rate: 6, average_salary: 172000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "AMD", industry: "Semiconductors", h1b_petitions_filed: 1600, approval_rate: 94, denial_rate: 6, average_salary: 158000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Walmart", industry: "Retail/Tech", h1b_petitions_filed: 1800, approval_rate: 91, denial_rate: 9, average_salary: 125000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level II-III" },
      { name: "Palo Alto Networks", industry: "Cybersecurity", h1b_petitions_filed: 980, approval_rate: 94, denial_rate: 6, average_salary: 168000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Snowflake", industry: "Technology", h1b_petitions_filed: 620, approval_rate: 95, denial_rate: 5, average_salary: 178000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Databricks", industry: "Technology", h1b_petitions_filed: 480, approval_rate: 95, denial_rate: 5, average_salary: 182000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Stripe", industry: "Technology", h1b_petitions_filed: 580, approval_rate: 95, denial_rate: 5, average_salary: 185000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Airbnb", industry: "Technology", h1b_petitions_filed: 720, approval_rate: 93, denial_rate: 7, average_salary: 170000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Lockheed Martin", industry: "Defense", h1b_petitions_filed: 1800, approval_rate: 91, denial_rate: 9, average_salary: 132000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level II-III" },
      { name: "General Motors", industry: "Automotive", h1b_petitions_filed: 1400, approval_rate: 91, denial_rate: 9, average_salary: 118000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level II-III" },
      { name: "Broadcom", industry: "Semiconductors", h1b_petitions_filed: 1800, approval_rate: 93, denial_rate: 7, average_salary: 165000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "ServiceNow", industry: "Technology", h1b_petitions_filed: 840, approval_rate: 94, denial_rate: 6, average_salary: 162000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Workday", industry: "Technology", h1b_petitions_filed: 980, approval_rate: 94, denial_rate: 6, average_salary: 155000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "CrowdStrike", industry: "Cybersecurity", h1b_petitions_filed: 620, approval_rate: 94, denial_rate: 6, average_salary: 162000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level III-IV" },
      { name: "Eli Lilly", industry: "Pharma", h1b_petitions_filed: 980, approval_rate: 94, denial_rate: 6, average_salary: 138000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level II-III" },
      { name: "Abbott Laboratories", industry: "Healthcare", h1b_petitions_filed: 1200, approval_rate: 93, denial_rate: 7, average_salary: 128000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level II-III" },
      { name: "Raytheon Technologies", industry: "Defense", h1b_petitions_filed: 1600, approval_rate: 90, denial_rate: 10, average_salary: 125000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level II-III" },
      { name: "Wells Fargo", industry: "Finance", h1b_petitions_filed: 1700, approval_rate: 91, denial_rate: 9, average_salary: 125000, trust_score: 9, sponsors_green_cards: 1, wage_level: "Level II-III" },
    ];

    const seedStmt = db.prepare(`
      INSERT OR IGNORE INTO companies 
      (id, name, industry, h1b_petitions_filed, approval_rate, denial_rate,
       average_salary, trust_score, sponsors_green_cards, wage_level, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const seedMany = db.transaction((companies) => {
      for (const c of companies) {
        const id = require('crypto').randomUUID();
        seedStmt.run(id, c.name, c.industry, c.h1b_petitions_filed,
          c.approval_rate, c.denial_rate, c.average_salary,
          c.trust_score, c.sponsors_green_cards, c.wage_level);
      }
    });

    seedMany(H1B_COMPANIES);
    console.log(`✅ Seeded ${H1B_COMPANIES.length} H-1B sponsoring companies!`);
  }

  // Job alerts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      field_of_study TEXT NOT NULL,
      target_location TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Job listings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_listings (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      title TEXT NOT NULL,
      location TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      job_board TEXT,
      apply_url TEXT,
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  // OPT tracker (OPTGuard)
  db.exec(`
    CREATE TABLE IF NOT EXISTS opt_tracker (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      graduation_date DATE NOT NULL,
      opt_start_date DATE,
      unemployment_days_used INTEGER DEFAULT 0,
      current_status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Saved companies
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_companies (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )
  `);

  console.log('✅ Database initialized');
}

// Middleware
app.use(helmet());

// CORS configuration (works with Railway auto-generated domains)
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost',
      /railway\.app$/
    ];
    if (!origin || allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return origin === allowed;
    })) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  }
}));

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Verify JWT token (simplified)
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'h1bhunter-secret');
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ===== API ROUTES =====

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth: Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const userId = uuid();
  const bcrypt = require('bcryptjs');
  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, first_name, last_name)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, email, passwordHash, firstName || '', lastName || '');

    res.status(201).json({
      id: userId,
      email,
      message: 'User registered successfully'
    });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

// Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const bcrypt = require('bcryptjs');
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT (simplified)
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });

  res.json({ token, userId: user.id, email: user.email });
});

// Company Search
app.get('/api/companies/search', (req, res) => {
  const { field, location, industry, name, limit = 20, offset = 0 } = req.query;

  let query = 'SELECT * FROM companies WHERE 1=1';
  const params = [];

  // Search by field of study OR company name OR industry
  if (field) {
    query += ' AND (industry LIKE ? OR name LIKE ?)';
    params.push(`%${field}%`, `%${field}%`);
  }

  // Search by industry specifically
  if (industry) {
    query += ' AND industry LIKE ?';
    params.push(`%${industry}%`);
  }

  // Search by company name
  if (name) {
    query += ' AND name LIKE ?';
    params.push(`%${name}%`);
  }

  query += ' ORDER BY h1b_petitions_filed DESC, trust_score DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const companies = db.prepare(query).all(...params);

  // Count with same filters
  let countQuery = 'SELECT COUNT(*) as count FROM companies WHERE 1=1';
  const countParams = [];
  if (field) { countQuery += ' AND (industry LIKE ? OR name LIKE ?)'; countParams.push(`%${field}%`, `%${field}%`); }
  if (industry) { countQuery += ' AND industry LIKE ?'; countParams.push(`%${industry}%`); }
  if (name) { countQuery += ' AND name LIKE ?'; countParams.push(`%${name}%`); }
  const total = db.prepare(countQuery).get(...countParams).count;

  res.json({ companies, total, limit: parseInt(limit), offset: parseInt(offset) });
});

// Get Company Details
app.get('/api/companies/:id', (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  // Get recent job listings
  const jobs = db.prepare(`
    SELECT * FROM job_listings 
    WHERE company_id = ? 
    ORDER BY scraped_at DESC 
    LIMIT 10
  `).all(req.params.id);

  res.json({ ...company, recentJobs: jobs });
});

// Job Alerts - Create
app.post('/api/alerts', verifyToken, (req, res) => {
  const { field, location } = req.body;
  const alertId = uuid();

  db.prepare(`
    INSERT INTO job_alerts (id, user_id, field_of_study, target_location)
    VALUES (?, ?, ?, ?)
  `).run(alertId, req.userId, field, location);

  res.status(201).json({ id: alertId, message: 'Alert created' });
});

// Job Alerts - List
app.get('/api/alerts', verifyToken, (req, res) => {
  const alerts = db.prepare(`
    SELECT * FROM job_alerts WHERE user_id = ? AND is_active = 1
  `).all(req.userId);

  res.json({ alerts });
});

// OPTGuard - Create tracker
app.post('/api/optguard', verifyToken, (req, res) => {
  const { graduationDate } = req.body;
  const trackerId = uuid();

  db.prepare(`
    INSERT INTO opt_tracker (id, user_id, graduation_date, current_status)
    VALUES (?, ?, ?, ?)
  `).run(trackerId, req.userId, graduationDate, 'planning');

  res.status(201).json({ id: trackerId });
});

// OPTGuard - Get tracker
app.get('/api/optguard', verifyToken, (req, res) => {
  const tracker = db.prepare('SELECT * FROM opt_tracker WHERE user_id = ?').get(req.userId);

  if (!tracker) {
    return res.status(404).json({ error: 'No OPT tracker found' });
  }

  // Calculate days remaining
  const gradDate = new Date(tracker.graduation_date);
  const optStartDate = new Date(gradDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  const today = new Date();
  const daysRemaining = Math.max(0, 90 - tracker.unemployment_days_used);

  res.json({
    ...tracker,
    optStartDate,
    daysRemaining,
    daysWarning: daysRemaining <= 30 ? 'warning' : daysRemaining <= 15 ? 'critical' : 'ok'
  });
});

// Save company
app.post('/api/companies/:id/save', verifyToken, (req, res) => {
  const saveId = uuid();

  db.prepare(`
    INSERT OR IGNORE INTO saved_companies (id, user_id, company_id)
    VALUES (?, ?, ?)
  `).run(saveId, req.userId, req.params.id);

  res.json({ message: 'Company saved' });
});

// Get saved companies
app.get('/api/saved-companies', verifyToken, (req, res) => {
  const companies = db.prepare(`
    SELECT c.* FROM companies c
    JOIN saved_companies s ON c.id = s.company_id
    WHERE s.user_id = ?
    ORDER BY s.saved_at DESC
  `).all(req.userId);

  res.json({ companies });
});

// Stripe: Create checkout session for premium subscription
app.post('/api/stripe/checkout', verifyToken, async (req, res) => {
  if (!stripe || !process.env.STRIPE_PRICE_ID) {
    return res.status(400).json({ error: 'Stripe not configured' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1
      }],
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/pricing`,
      customer_email: user.email,
      metadata: {
        userId: req.userId
      }
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe: Handle webhook (for production, use Stripe CLI locally)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    return res.status(400).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test'
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Handle subscription events
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    const subscription = event.data.object;
    const userId = subscription.metadata?.userId;
    
    if (userId && subscription.status === 'active') {
      db.prepare(`
        UPDATE users SET is_premium = 1, subscription_active_until = ?
        WHERE id = ?
      `).run(new Date(subscription.current_period_end * 1000).toISOString(), userId);
    }
  }

  res.json({ received: true });
});

// Get all industries for filter dropdown
app.get('/api/industries', (req, res) => {
  const industries = db.prepare('SELECT DISTINCT industry FROM companies ORDER BY industry').all();
  res.json({ industries: industries.map(r => r.industry) });
});

// Get company stats
app.get('/api/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM companies').get().count;
  const totalPetitions = db.prepare('SELECT SUM(h1b_petitions_filed) as total FROM companies').get().total;
  const avgApproval = db.prepare('SELECT AVG(approval_rate) as avg FROM companies').get().avg;
  res.json({ totalCompanies: total, totalPetitions, avgApprovalRate: avgApproval ? avgApproval.toFixed(1) : 0 });
});

// Health check (required for Railway)
app.get('/health', (req, res) => {
  const companyCount = db.prepare('SELECT COUNT(*) as count FROM companies').get().count;
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), companies: companyCount });
});

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ===== START SERVER =====

try {
  initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`🌊 H1BHunter running on port ${PORT}`);
    console.log(`📊 Database: ${dbPath}`);
  });
} catch (err) {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
}

module.exports = app;
