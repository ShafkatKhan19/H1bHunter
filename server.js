#!/usr/bin/env node

/**
 * H1BHunter & OPTGuard - Main Server v2
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
const axios = require('axios');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const Anthropic = process.env.ANTHROPIC_API_KEY ? new (require('@anthropic-ai/sdk'))({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

// Import utility files
const claudeApi = require('./utils/claudeApi');
const jobScrapers = require('./utils/jobScrapers');
const resumeGen = require('./utils/resumeGenerator');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Create data directory
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const dbPath = path.join(dataDir, 'h1bhunter.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Multer memory storage
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── DATABASE SCHEMA ──────────────────────────────────────────────────────────

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
      career_page_url TEXT,
      linkedin_jobs_url TEXT,
      indeed_company_url TEXT,
      target_location TEXT,
      last_updated DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrate columns that may already exist
  const migrations = [
    'ALTER TABLE companies ADD COLUMN career_page_url TEXT',
    'ALTER TABLE companies ADD COLUMN linkedin_jobs_url TEXT',
    'ALTER TABLE companies ADD COLUMN indeed_company_url TEXT',
    'ALTER TABLE companies ADD COLUMN target_location TEXT',
    'ALTER TABLE users ADD COLUMN resume_attempts_used INTEGER DEFAULT 0',
    'ALTER TABLE users ADD COLUMN saved_companies_json TEXT DEFAULT \'[]\'',
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch (e) { /* column already exists */ }
  }

  // New tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS resume_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS job_clicks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_name TEXT,
      job_title TEXT,
      job_url TEXT,
      clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS subscription_details (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      plan_type TEXT DEFAULT 'monthly',
      renewal_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS scraped_jobs (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      company_name TEXT NOT NULL,
      job_title TEXT NOT NULL,
      location TEXT,
      apply_url TEXT,
      source TEXT,
      visa_friendly INTEGER DEFAULT 0,
      visa_analysis TEXT,
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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

  // OPT tracker
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

  // Seed companies if empty
  const companyCount = db.prepare('SELECT COUNT(*) as count FROM companies').get();
  if (companyCount.count === 0) {
    console.log('Seeding H-1B company database...');
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
    console.log(`Seeded ${H1B_COMPANIES.length} H-1B sponsoring companies.`);
  }

  console.log('Database initialized');
}

// ── COMPANY JOB SOURCES ───────────────────────────────────────────────────────

const COMPANY_JOB_SOURCES = {
  'Amazon': { greenhouse: null, lever: null, workday: 'amazon' },
  'Google': { greenhouse: 'google', lever: null },
  'Microsoft': { greenhouse: null, lever: null, workday: 'microsoft' },
  'Meta': { greenhouse: 'meta', lever: null },
  'Apple': { greenhouse: 'apple', lever: null },
  'Stripe': { greenhouse: 'stripe', lever: null },
  'Airbnb': { greenhouse: 'airbnb', lever: null },
  'Uber': { lever: 'uber', greenhouse: null },
  'Netflix': { greenhouse: 'netflix', lever: null },
  'Snowflake': { greenhouse: 'snowflake-computing', lever: null },
  'Databricks': { greenhouse: 'databricks', lever: null },
  'CrowdStrike': { greenhouse: 'crowdstrike', lever: null },
  'Palo Alto Networks': { greenhouse: 'paloaltonetworks', lever: null },
  'ServiceNow': { greenhouse: 'servicenow', lever: null },
};

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────

function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function optionalAuth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
    } catch (e) { /* ignore */ }
  }
  next();
}

function requirePremium(req, res, next) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  if (!user.is_premium) return res.status(403).json({ error: 'Premium required' });
  req.user = user;
  next();
}

// ── JOB SCRAPING HELPERS ─────────────────────────────────────────────────────

async function scrapeGreenhouseJobs(companySlug, companyName, companyId) {
  const apiResp = await axios.get(
    `https://boards-api.greenhouse.io/v1/boards/${companySlug}/jobs?content=true`,
    { timeout: 10000 }
  );
  return (apiResp.data.jobs || []).map(j => ({
    company_name: companyName,
    company_id: companyId,
    job_title: j.title,
    location: j.location?.name || null,
    apply_url: j.absolute_url,
    source: 'greenhouse',
    description: j.content || ''
  }));
}

async function scrapeLeverJobs(companySlug, companyName, companyId) {
  const resp = await axios.get(
    `https://api.lever.co/v0/postings/${companySlug}?mode=json`,
    { timeout: 10000 }
  );
  return (resp.data || []).map(j => ({
    company_name: companyName,
    company_id: companyId,
    job_title: j.text,
    location: j.categories?.location || null,
    apply_url: j.hostedUrl,
    source: 'lever',
    description: j.descriptionPlain || ''
  }));
}

async function analyzeJobForVisa(description) {
  if (!Anthropic) return { visa_friendly: false, summary: 'Anthropic not configured' };
  try {
    const msg = await Anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Does this job posting mention visa sponsorship, H-1B, OPT, CPT, work authorization, or similar? Reply with JSON only: {"visa_friendly": true/false, "summary": "..."}\n\nJob description (first 1000 chars):\n${description.substring(0, 1000)}`
      }]
    });
    const text = msg.content[0]?.text || '{}';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return { visa_friendly: false, summary: 'Could not parse' };
  } catch (e) {
    return { visa_friendly: false, summary: 'Analysis failed' };
  }
}

// ── EXPRESS SETUP ─────────────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"]
    }
  }
}));
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = ['http://localhost:3000', 'http://localhost', /railway\.app$/];
    if (!origin || allowedOrigins.some(a => (a instanceof RegExp ? a.test(origin) : origin === a))) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  }
}));
app.use(morgan('combined'));
// Stripe webhook needs raw body — register before json parser
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Favicon route - prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).send();
});

// ── ROUTES ────────────────────────────────────────────────────────────────────

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/api/auth/register', (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const userId = uuid();
  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, first_name, last_name)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, email, passwordHash, firstName || '', lastName || '');

    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, id: userId, userId, email, is_premium: 0, message: 'Registered successfully' });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, id: user.id, userId: user.id, email: user.email, is_premium: user.is_premium });
});

// ── User me ───────────────────────────────────────────────────────────────────

app.get('/api/user/me', verifyToken, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.is_premium,
           u.subscription_active_until, u.resume_attempts_used,
           u.field_of_study, u.target_location,
           sd.renewal_date, sd.plan_type, sd.stripe_subscription_id
    FROM users u
    LEFT JOIN subscription_details sd ON sd.user_id = u.id
    WHERE u.id = ?
  `).get(req.userId);

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ── Cap Season ────────────────────────────────────────────────────────────────

app.get('/api/cap-season', (req, res) => {
  const now = new Date();
  const year = now.getFullYear();
  const capOpen = new Date(year, 0, 1);   // Jan 1
  const capClose = new Date(year, 3, 1);  // Apr 1

  const active = now >= capOpen && now < capClose;
  const daysUntilClose = active
    ? Math.ceil((capClose - now) / (1000 * 60 * 60 * 24))
    : 0;

  res.json({ active, daysUntilClose });
});

// ── Company Search ────────────────────────────────────────────────────────────

app.get('/api/companies/search', (req, res) => {
  const { field, location, limit = 100, offset = 0 } = req.query;

  let query = 'SELECT * FROM companies WHERE 1=1';
  const params = [];

  if (field) {
    query += ' AND (industry LIKE ? OR name LIKE ?)';
    params.push(`%${field}%`, `%${field}%`);
  }
  if (location) {
    query += ' AND (target_location LIKE ? OR target_location IS NULL)';
    params.push(`%${location}%`);
  }

  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
  const total = db.prepare(countQuery).get(...params)?.count || 0;

  query += ' ORDER BY trust_score DESC, h1b_petitions_filed DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const companies = db.prepare(query).all(...params);
  res.json({ companies, total, limit: parseInt(limit), offset: parseInt(offset) });
});

// ── Company Details ───────────────────────────────────────────────────────────

app.get('/api/companies/:id', (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const jobs = db.prepare(`
    SELECT * FROM job_listings WHERE company_id = ? ORDER BY scraped_at DESC LIMIT 10
  `).all(req.params.id);

  res.json({ ...company, recentJobs: jobs });
});

// ── Save / Get saved companies ────────────────────────────────────────────────

app.post('/api/companies/:id/save', verifyToken, (req, res) => {
  const saveId = uuid();
  try {
    db.prepare('INSERT OR IGNORE INTO saved_companies (id, user_id, company_id) VALUES (?, ?, ?)')
      .run(saveId, req.userId, req.params.id);
    res.json({ message: 'Company saved' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save company' });
  }
});

app.get('/api/saved-companies', verifyToken, (req, res) => {
  const companies = db.prepare(`
    SELECT c.* FROM companies c
    JOIN saved_companies s ON c.id = s.company_id
    WHERE s.user_id = ?
    ORDER BY s.saved_at DESC
  `).all(req.userId);
  res.json({ companies });
});

// ── Job Alerts ────────────────────────────────────────────────────────────────

app.post('/api/alerts', verifyToken, (req, res) => {
  const { field, location } = req.body;
  const alertId = uuid();
  db.prepare('INSERT INTO job_alerts (id, user_id, field_of_study, target_location) VALUES (?, ?, ?, ?)')
    .run(alertId, req.userId, field, location);
  res.status(201).json({ id: alertId, message: 'Alert created' });
});

app.get('/api/alerts', verifyToken, (req, res) => {
  const alerts = db.prepare('SELECT * FROM job_alerts WHERE user_id = ? AND is_active = 1').all(req.userId);
  res.json({ alerts });
});

// ── OPTGuard ──────────────────────────────────────────────────────────────────

app.post('/api/optguard', verifyToken, (req, res) => {
  const { graduationDate } = req.body;
  const trackerId = uuid();
  db.prepare('INSERT INTO opt_tracker (id, user_id, graduation_date, current_status) VALUES (?, ?, ?, ?)')
    .run(trackerId, req.userId, graduationDate, 'planning');
  res.status(201).json({ id: trackerId });
});

app.get('/api/optguard', verifyToken, (req, res) => {
  const tracker = db.prepare('SELECT * FROM opt_tracker WHERE user_id = ?').get(req.userId);
  if (!tracker) return res.status(404).json({ error: 'No OPT tracker found' });

  const gradDate = new Date(tracker.graduation_date);
  const optStartDate = new Date(gradDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  const daysRemaining = Math.max(0, 90 - tracker.unemployment_days_used);
  res.json({
    ...tracker,
    optStartDate,
    daysRemaining,
    daysWarning: daysRemaining <= 15 ? 'critical' : daysRemaining <= 30 ? 'warning' : 'ok'
  });
});

// ── Jobs ──────────────────────────────────────────────────────────────────────

app.get('/api/jobs', optionalAuth, (req, res) => {
  if (!req.userId) {
    return res.json({ jobs: [], locked: true, message: 'Login required to view jobs' });
  }
  const user = db.prepare('SELECT is_premium FROM users WHERE id = ?').get(req.userId);
  if (!user || !user.is_premium) {
    return res.json({ jobs: [], locked: true, message: 'Premium required to view jobs' });
  }

  const jobs = db.prepare('SELECT * FROM scraped_jobs ORDER BY scraped_at DESC LIMIT 200').all();
  res.json({ jobs, locked: false });
});

app.post('/api/jobs/scrape', verifyToken, requirePremium, async (req, res) => {
  res.json({ message: 'Scraping started in background' });

  // Run in background
  (async () => {
    const insertJob = db.prepare(`
      INSERT OR IGNORE INTO scraped_jobs (id, company_id, company_name, job_title, location, apply_url, source, visa_friendly, visa_analysis, scraped_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const companies = db.prepare('SELECT * FROM companies').all();
    const companyMap = {};
    for (const c of companies) companyMap[c.name] = c.id;

    const tasks = Object.entries(COMPANY_JOB_SOURCES).map(async ([companyName, sources]) => {
      const companyId = companyMap[companyName] || null;
      let jobs = [];

      if (sources.greenhouse) {
        try {
          jobs = jobs.concat(await scrapeGreenhouseJobs(sources.greenhouse, companyName, companyId));
        } catch (e) { console.error(`Greenhouse scrape failed for ${companyName}:`, e.message); }
      }
      if (sources.lever) {
        try {
          jobs = jobs.concat(await scrapeLeverJobs(sources.lever, companyName, companyId));
        } catch (e) { console.error(`Lever scrape failed for ${companyName}:`, e.message); }
      }

      for (const job of jobs) {
        const visaResult = await analyzeJobForVisa(job.description || '');
        try {
          insertJob.run(
            uuid(), job.company_id, job.company_name, job.job_title,
            job.location, job.apply_url, job.source,
            visaResult.visa_friendly ? 1 : 0, visaResult.summary
          );
        } catch (e) { /* duplicate */ }
      }
      console.log(`Scraped ${jobs.length} jobs for ${companyName}`);
    });

    await Promise.allSettled(tasks);
    console.log('Job scraping complete');
  })().catch(e => console.error('Scraping error:', e));
});

app.post('/api/jobs/click', verifyToken, (req, res) => {
  const { company_name, job_title, job_url } = req.body;
  db.prepare('INSERT INTO job_clicks (id, user_id, company_name, job_title, job_url) VALUES (?, ?, ?, ?, ?)')
    .run(uuid(), req.userId, company_name, job_title, job_url);
  res.json({ message: 'Recorded' });
});

app.get('/api/jobs/history', verifyToken, (req, res) => {
  const history = db.prepare('SELECT * FROM job_clicks WHERE user_id = ? ORDER BY clicked_at DESC LIMIT 50').all(req.userId);
  res.json({ history });
});

// ── Resume ────────────────────────────────────────────────────────────────────

app.get('/api/resume/attempts', verifyToken, (req, res) => {
  const user = db.prepare('SELECT is_premium, resume_attempts_used FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ is_premium: user.is_premium, resume_attempts_used: user.resume_attempts_used || 0 });
});

app.post('/api/resume/scrape-job', verifyToken, requirePremium, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const resp = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; H1BHunter/2.0)' }
    });
    // Strip HTML tags
    const text = resp.data
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000);
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch job description: ' + e.message });
  }
});

app.post('/api/resume/upload', verifyToken, requirePremium, upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { mimetype, buffer, originalname } = req.file;

  try {
    let text = '';
    if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      originalname.endsWith('.docx')
    ) {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return res.status(400).json({ error: 'Only PDF and .docx files are supported' });
    }

    res.json({ text: text.substring(0, 10000) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to parse resume: ' + e.message });
  }
});

app.post('/api/resume/analyze', verifyToken, requirePremium, async (req, res) => {
  const { jobDescription, resumeText } = req.body;
  if (!jobDescription || !resumeText) {
    return res.status(400).json({ error: 'jobDescription and resumeText are required' });
  }

  if (!Anthropic) return res.status(503).json({ error: 'Anthropic not configured' });

  // Check attempts
  const user = db.prepare('SELECT resume_attempts_used FROM users WHERE id = ?').get(req.userId);
  const attemptsUsed = user?.resume_attempts_used || 0;
  if (attemptsUsed >= 3) {
    return res.status(402).json({ error: 'Resume attempt limit reached. Please pay $0.99 to continue.', attempts_used: attemptsUsed });
  }

  try {
    const msg = await Anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a career coach. Compare this job description with this resume.
Return ONLY valid JSON with this exact structure:
{
  "gap_analysis": "...",
  "match_score": 75,
  "sections": {
    "summary": { "original": "...", "suggested": "..." },
    "skills": { "original": "...", "suggested": "..." },
    "experience": { "original": "...", "suggested": "..." },
    "education": { "original": "...", "suggested": "..." }
  }
}

JOB DESCRIPTION:
${jobDescription.substring(0, 4000)}

RESUME:
${resumeText.substring(0, 4000)}`
      }]
    });

    const responseText = msg.content[0]?.text || '{}';
    const match = responseText.match(/\{[\s\S]*\}/);
    let analysisData;
    try {
      analysisData = JSON.parse(match ? match[0] : '{}');
    } catch (e) {
      analysisData = { gap_analysis: responseText, match_score: 0, sections: {} };
    }

    // Increment attempts
    db.prepare('UPDATE users SET resume_attempts_used = resume_attempts_used + 1 WHERE id = ?').run(req.userId);
    db.prepare('INSERT INTO resume_attempts (id, user_id) VALUES (?, ?)').run(uuid(), req.userId);

    res.json(analysisData);
  } catch (e) {
    res.status(500).json({ error: 'Analysis failed: ' + e.message });
  }
});

app.post('/api/resume/download', verifyToken, requirePremium, async (req, res) => {
  const { sections } = req.body;
  if (!sections) return res.status(400).json({ error: 'sections required' });

  try {
    const { Document, Paragraph, TextRun, HeadingLevel, Packer } = require('docx');

    const children = [
      new Paragraph({
        text: 'Optimized Resume',
        heading: HeadingLevel.HEADING_1
      })
    ];

    const sectionOrder = ['summary', 'skills', 'experience', 'education'];
    for (const key of sectionOrder) {
      if (sections[key]) {
        children.push(
          new Paragraph({
            text: key.charAt(0).toUpperCase() + key.slice(1),
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({
            children: [new TextRun({ text: sections[key], size: 24 })]
          }),
          new Paragraph({ text: '' })
        );
      }
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="resume-optimized.docx"');
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate document: ' + e.message });
  }
});

// ── Stripe ────────────────────────────────────────────────────────────────────

app.post('/api/stripe/checkout', verifyToken, async (req, res) => {
  if (!stripe) return res.status(400).json({ error: 'Stripe not configured' });

  const { plan = 'monthly' } = req.body;
  const priceId = plan === 'sixmonth'
    ? (process.env.STRIPE_PRICE_ID_6MO || process.env.STRIPE_PRICE_ID)
    : process.env.STRIPE_PRICE_ID;

  if (!priceId) return res.status(400).json({ error: 'Stripe price not configured' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/`,
      customer_email: user.email,
      metadata: { userId: req.userId, plan }
    });
    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.post('/api/stripe/cancel', verifyToken, async (req, res) => {
  if (!stripe) return res.status(400).json({ error: 'Stripe not configured' });

  try {
    const subDetails = db.prepare('SELECT * FROM subscription_details WHERE user_id = ?').get(req.userId);
    if (subDetails?.stripe_subscription_id) {
      await stripe.subscriptions.update(subDetails.stripe_subscription_id, { cancel_at_period_end: true });
    }
    res.json({ message: 'Subscription will cancel at end of billing period' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to cancel subscription: ' + e.message });
  }
});

app.post('/api/stripe/charge-resume', verifyToken, requirePremium, async (req, res) => {
  if (!stripe) return res.status(400).json({ error: 'Stripe not configured' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    const subDetails = db.prepare('SELECT stripe_customer_id FROM subscription_details WHERE user_id = ?').get(req.userId);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 99, // $0.99
      currency: 'usd',
      customer: subDetails?.stripe_customer_id || undefined,
      metadata: { userId: req.userId, type: 'resume_analysis' },
      description: 'H1BHunter Resume Analysis'
    });

    res.json({ client_secret: paymentIntent.client_secret, payment_intent_id: paymentIntent.id });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create payment: ' + e.message });
  }
});

// ── Stripe Webhook ────────────────────────────────────────────────────────────

async function handleStripeWebhook(req, res) {
  if (!stripe) return res.status(400).json({ error: 'Stripe not configured' });

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

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.created'
  ) {
    const subscription = event.data.object;
    const userId = subscription.metadata?.userId;

    if (userId && subscription.status === 'active') {
      const renewalDate = new Date(subscription.current_period_end * 1000).toISOString();
      db.prepare(`
        UPDATE users SET is_premium = 1, subscription_active_until = ? WHERE id = ?
      `).run(renewalDate, userId);

      // Upsert subscription_details
      db.prepare(`
        INSERT INTO subscription_details (id, user_id, stripe_customer_id, stripe_subscription_id, plan_type, renewal_date)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          stripe_customer_id = excluded.stripe_customer_id,
          stripe_subscription_id = excluded.stripe_subscription_id,
          plan_type = excluded.plan_type,
          renewal_date = excluded.renewal_date
      `).run(uuid(), userId, subscription.customer, subscription.id, subscription.metadata?.plan || 'monthly', renewalDate);
    }

    if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
      const userId2 = subscription.metadata?.userId;
      if (userId2 && subscription.status === 'canceled') {
        db.prepare('UPDATE users SET is_premium = 0 WHERE id = ?').run(userId2);
      }
    }
  }

  res.json({ received: true });
}

// ── Catch-all ─────────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── START ─────────────────────────────────────────────────────────────────────

try {
  initializeDatabase();
  app.listen(PORT, () => {
    console.log(`H1BHunter running on port ${PORT}`);
    console.log(`Database: ${dbPath}`);
  });
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}

module.exports = app;
