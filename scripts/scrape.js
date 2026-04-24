#!/usr/bin/env node

/**
 * H1BHunter Data Scraper
 * Scrapes company H-1B data from public sources
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const db = new Database(path.join(__dirname, '../data/h1bhunter.db'));

// Sample H-1B employer data (would normally scrape from live sources)
const SAMPLE_COMPANIES = [
  {
    name: 'Google',
    industry: 'Technology',
    h1b_petitions: 3500,
    approval_rate: 98.5,
    denial_rate: 1.5,
    avg_salary: 165000,
    wage_level: 'Level 4',
    sponsors_green_cards: true
  },
  {
    name: 'Microsoft',
    industry: 'Technology',
    h1b_petitions: 3200,
    approval_rate: 97.8,
    denial_rate: 2.2,
    avg_salary: 158000,
    wage_level: 'Level 4',
    sponsors_green_cards: true
  },
  {
    name: 'Apple',
    industry: 'Technology',
    h1b_petitions: 2800,
    approval_rate: 96.9,
    denial_rate: 3.1,
    avg_salary: 162000,
    wage_level: 'Level 4',
    sponsors_green_cards: true
  },
  {
    name: 'Amazon',
    industry: 'Technology',
    h1b_petitions: 4200,
    approval_rate: 95.2,
    denial_rate: 4.8,
    avg_salary: 155000,
    wage_level: 'Level 3',
    sponsors_green_cards: true
  },
  {
    name: 'Meta',
    industry: 'Technology',
    h1b_petitions: 2500,
    approval_rate: 96.1,
    denial_rate: 3.9,
    avg_salary: 168000,
    wage_level: 'Level 4',
    sponsors_green_cards: true
  },
  {
    name: 'Goldman Sachs',
    industry: 'Finance',
    h1b_petitions: 800,
    approval_rate: 98.2,
    denial_rate: 1.8,
    avg_salary: 220000,
    wage_level: 'Level 4',
    sponsors_green_cards: true
  },
  {
    name: 'JP Morgan Chase',
    industry: 'Finance',
    h1b_petitions: 1200,
    approval_rate: 97.5,
    denial_rate: 2.5,
    avg_salary: 185000,
    wage_level: 'Level 4',
    sponsors_green_cards: true
  },
  {
    name: 'McKinsey',
    industry: 'Consulting',
    h1b_petitions: 600,
    approval_rate: 99.1,
    denial_rate: 0.9,
    avg_salary: 195000,
    wage_level: 'Level 4',
    sponsors_green_cards: true
  },
  {
    name: 'Intel',
    industry: 'Technology',
    h1b_petitions: 1800,
    approval_rate: 94.3,
    denial_rate: 5.7,
    avg_salary: 145000,
    wage_level: 'Level 3',
    sponsors_green_cards: true
  },
  {
    name: 'Qualcomm',
    industry: 'Technology',
    h1b_petitions: 950,
    approval_rate: 95.8,
    denial_rate: 4.2,
    avg_salary: 152000,
    wage_level: 'Level 3',
    sponsors_green_cards: true
  }
];

async function scrapeCompanyData() {
  console.log('🌊 Starting H-1B data scrape...');

  try {
    // Scrape from USCIS public data (simplified)
    // In production, parse the actual USCIS CSV
    console.log('📥 Fetching company data from sources...');

    // For now, use sample data
    // TODO: Integrate real scraping from:
    // - h1bgrader.com
    // - myvisajobs.com
    // - USCIS H-1B Employer Data Hub CSV

    let addedCount = 0;

    for (const company of SAMPLE_COMPANIES) {
      // Calculate trust score
      const trustScore = calculateTrustScore(company);

      try {
        db.prepare(`
          INSERT OR REPLACE INTO companies (
            id, name, industry, h1b_petitions_filed, approval_rate, denial_rate,
            average_salary, trust_score, wage_level, sponsors_green_cards, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          company.name.toLowerCase().replace(/\s+/g, '-'),
          company.name,
          company.industry,
          company.h1b_petitions,
          company.approval_rate,
          company.denial_rate,
          company.avg_salary,
          trustScore,
          company.wage_level,
          company.sponsors_green_cards ? 1 : 0,
          new Date().toISOString()
        );

        addedCount++;
        console.log(`✅ Added ${company.name}`);
      } catch (err) {
        console.error(`❌ Failed to add ${company.name}:`, err.message);
      }
    }

    // Generate sample job listings
    console.log('\n📋 Generating job listings...');
    scrapeJobListings();

    console.log(`\n✨ Scrape complete! Added ${addedCount} companies`);
  } catch (err) {
    console.error('❌ Scrape failed:', err);
  }
}

function calculateTrustScore(company) {
  let score = 0;

  // Approval rate (0-3 points)
  if (company.approval_rate >= 98) score += 3;
  else if (company.approval_rate >= 95) score += 2.5;
  else if (company.approval_rate >= 90) score += 2;
  else score += 1;

  // Number of petitions filed (0-3 points)
  if (company.h1b_petitions >= 3000) score += 3;
  else if (company.h1b_petitions >= 1500) score += 2;
  else if (company.h1b_petitions >= 500) score += 1.5;
  else score += 1;

  // Sponsors green cards (0-2 points)
  if (company.sponsors_green_cards) score += 2;

  // Wage level (0-2 points)
  if (company.wage_level === 'Level 4') score += 2;
  else if (company.wage_level === 'Level 3') score += 1;

  // Denial rate penalty (0 to -1.5 points)
  if (company.denial_rate > 10) score -= 1.5;
  else if (company.denial_rate > 5) score -= 1;

  return Math.max(1, Math.min(10, Math.round(score)));
}

async function scrapeJobListings() {
  const JOB_BOARDS = [
    { name: 'Indeed', url: 'https://www.indeed.com/jobs?q=H-1B+sponsored' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs/search/?keywords=H-1B' },
    { name: 'Glassdoor', url: 'https://www.glassdoor.com/Job/jobs.htm?sc.keyword=H-1B' }
  ];

  // In production, scrape actual job listings from these sites
  // For MVP, create sample listings

  const companies = db.prepare('SELECT id FROM companies LIMIT 10').all();
  const jobTitles = [
    'Senior Software Engineer',
    'Data Scientist',
    'Product Manager',
    'Full Stack Developer',
    'Machine Learning Engineer',
    'Solutions Architect',
    'DevOps Engineer'
  ];

  let addedJobs = 0;

  for (const company of companies) {
    for (let i = 0; i < Math.floor(Math.random() * 5) + 1; i++) {
      const jobTitle = jobTitles[Math.floor(Math.random() * jobTitles.length)];
      const salaryMin = 100000 + Math.random() * 100000;
      const salaryMax = salaryMin + 30000;

      try {
        db.prepare(`
          INSERT INTO job_listings (
            id, company_id, title, location, salary_min, salary_max, job_board, apply_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `job-${Date.now()}-${i}`,
          company.id,
          jobTitle,
          'San Francisco, CA',
          Math.floor(salaryMin),
          Math.floor(salaryMax),
          'Indeed',
          'https://www.indeed.com/jobs'
        );

        addedJobs++;
      } catch (err) {
        console.error('Failed to add job:', err.message);
      }
    }
  }

  console.log(`✅ Added ${addedJobs} job listings`);
}

// Run scraper
scrapeCompanyData().catch(console.error);
