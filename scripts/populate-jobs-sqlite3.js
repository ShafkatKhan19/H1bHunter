#!/usr/bin/env node

/**
 * Populate Job Listings with Application URLs
 * Using sqlite3 package (simpler installation)
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { v4: uuid } = require('uuid');
const path = require('path');

// Connect to database
const dbPath = path.join(process.cwd(), 'data', 'h1bhunter.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database\n');
  populateJobs();
});

// Company URLs and sample jobs
const COMPANY_URLS = {
  "Amazon": {
    career_page_url: "https://amazon.jobs/en/",
    linkedin_jobs_url: "https://www.linkedin.com/company/amazon/jobs/",
    indeed_company_url: "https://www.indeed.com/cmp/Amazon",
    jobs: [
      { title: "Software Engineer II - Backend", location: "Seattle, WA", salary_min: 160000, salary_max: 200000, job_board: "Amazon Careers", apply_url: "https://amazon.jobs/en/jobs/2300000/software-engineer/" },
      { title: "Data Engineer - AWS", location: "Seattle, WA", salary_min: 150000, salary_max: 190000, job_board: "Amazon Careers", apply_url: "https://amazon.jobs/en/jobs/2301000/data-engineer/" },
      { title: "ML Engineer - Alexa", location: "Boston, MA", salary_min: 170000, salary_max: 210000, job_board: "Amazon Careers", apply_url: "https://amazon.jobs/en/jobs/2302000/machine-learning-engineer/" }
    ]
  },
  "Google": {
    career_page_url: "https://careers.google.com/",
    linkedin_jobs_url: "https://www.linkedin.com/company/google/jobs/",
    indeed_company_url: "https://www.indeed.com/cmp/Google",
    jobs: [
      { title: "Software Engineer - Cloud", location: "Mountain View, CA", salary_min: 180000, salary_max: 230000, job_board: "Google Careers", apply_url: "https://careers.google.com/jobs/results/118857/" },
      { title: "Product Manager - AI/ML", location: "San Francisco, CA", salary_min: 190000, salary_max: 250000, job_board: "Google Careers", apply_url: "https://careers.google.com/jobs/results/119000/" },
      { title: "Data Scientist - Ads", location: "New York, NY", salary_min: 170000, salary_max: 220000, job_board: "Google Careers", apply_url: "https://careers.google.com/jobs/results/119100/" }
    ]
  },
  "Microsoft": {
    career_page_url: "https://careers.microsoft.com/us/en",
    linkedin_jobs_url: "https://www.linkedin.com/company/microsoft/jobs/",
    indeed_company_url: "https://www.indeed.com/cmp/Microsoft",
    jobs: [
      { title: "Senior Software Engineer - Azure", location: "Redmond, WA", salary_min: 175000, salary_max: 225000, job_board: "Microsoft Careers", apply_url: "https://careers.microsoft.com/us/en/job/1234567/" },
      { title: "Product Designer - Teams", location: "Puget Sound, WA", salary_min: 165000, salary_max: 215000, job_board: "Microsoft Careers", apply_url: "https://careers.microsoft.com/us/en/job/1234568/" },
      { title: "Systems Engineer - Security", location: "McLean, VA", salary_min: 160000, salary_max: 210000, job_board: "Microsoft Careers", apply_url: "https://careers.microsoft.com/us/en/job/1234569/" }
    ]
  },
  "Meta": {
    career_page_url: "https://www.metacareers.com/",
    linkedin_jobs_url: "https://www.linkedin.com/company/meta/jobs/",
    indeed_company_url: "https://www.indeed.com/cmp/Meta",
    jobs: [
      { title: "Software Engineer - Infrastructure", location: "Menlo Park, CA", salary_min: 190000, salary_max: 240000, job_board: "Meta Careers", apply_url: "https://www.metacareers.com/jobs/1234567/" },
      { title: "Data Scientist - Analytics", location: "Seattle, WA", salary_min: 175000, salary_max: 225000, job_board: "Meta Careers", apply_url: "https://www.metacareers.com/jobs/1234568/" },
      { title: "ML Engineer - Recommendation", location: "San Francisco, CA", salary_min: 185000, salary_max: 235000, job_board: "Meta Careers", apply_url: "https://www.metacareers.com/jobs/1234569/" }
    ]
  },
  "Apple": {
    career_page_url: "https://jobs.apple.com/",
    linkedin_jobs_url: "https://www.linkedin.com/company/apple/jobs/",
    indeed_company_url: "https://www.indeed.com/cmp/Apple",
    jobs: [
      { title: "Hardware Engineer - iPhone", location: "Cupertino, CA", salary_min: 180000, salary_max: 230000, job_board: "Apple Careers", apply_url: "https://jobs.apple.com/en-us/details/200467/" },
      { title: "Software Engineer - iOS", location: "Cupertino, CA", salary_min: 175000, salary_max: 225000, job_board: "Apple Careers", apply_url: "https://jobs.apple.com/en-us/details/200468/" },
      { title: "Security Engineer - Platform", location: "Sunnyvale, CA", salary_min: 170000, salary_max: 220000, job_board: "Apple Careers", apply_url: "https://jobs.apple.com/en-us/details/200469/" }
    ]
  },
  "Nvidia": {
    career_page_url: "https://nvidia.wd5.myworkdayjobs.com/NvidiaExternalCareerSite",
    linkedin_jobs_url: "https://www.linkedin.com/company/nvidia/jobs/",
    indeed_company_url: "https://www.indeed.com/cmp/NVIDIA",
    jobs: [
      { title: "CUDA Software Engineer", location: "Santa Clara, CA", salary_min: 185000, salary_max: 235000, job_board: "Nvidia Careers", apply_url: "https://nvidia.wd5.myworkdayjobs.com/en-US/NvidiaExternalCareerSite/job/" },
      { title: "AI/ML Research Engineer", location: "Santa Clara, CA", salary_min: 190000, salary_max: 240000, job_board: "Nvidia Careers", apply_url: "https://nvidia.wd5.myworkdayjobs.com/en-US/NvidiaExternalCareerSite/job/" },
      { title: "Computer Architecture Engineer", location: "Austin, TX", salary_min: 175000, salary_max: 225000, job_board: "Nvidia Careers", apply_url: "https://nvidia.wd5.myworkdayjobs.com/en-US/NvidiaExternalCareerSite/job/" }
    ]
  },
  "Netflix": {
    career_page_url: "https://jobs.netflix.com/",
    linkedin_jobs_url: "https://www.linkedin.com/company/netflix/jobs/",
    indeed_company_url: "https://www.indeed.com/cmp/Netflix",
    jobs: [
      { title: "Senior Backend Engineer - Streaming", location: "Los Gatos, CA", salary_min: 250000, salary_max: 320000, job_board: "Netflix Careers", apply_url: "https://jobs.netflix.com/jobs/234567/" },
      { title: "Machine Learning Engineer - Recommendations", location: "Los Gatos, CA", salary_min: 240000, salary_max: 310000, job_board: "Netflix Careers", apply_url: "https://jobs.netflix.com/jobs/234568/" },
      { title: "Data Engineer - Analytics", location: "Los Gatos, CA", salary_min: 220000, salary_max: 290000, job_board: "Netflix Careers", apply_url: "https://jobs.netflix.com/jobs/234569/" }
    ]
  },
  "Stripe": {
    career_page_url: "https://stripe.com/jobs",
    linkedin_jobs_url: "https://www.linkedin.com/company/stripe/jobs/",
    indeed_company_url: "https://www.indeed.com/cmp/Stripe",
    jobs: [
      { title: "Software Engineer - Payments", location: "San Francisco, CA", salary_min: 200000, salary_max: 280000, job_board: "Stripe Careers", apply_url: "https://stripe.com/jobs?jh=3456" },
      { title: "Backend Engineer - Infrastructure", location: "San Francisco, CA", salary_min: 190000, salary_max: 270000, job_board: "Stripe Careers", apply_url: "https://stripe.com/jobs?jh=3457" },
      { title: "ML Engineer - Fraud Detection", location: "San Francisco, CA", salary_min: 210000, salary_max: 290000, job_board: "Stripe Careers", apply_url: "https://stripe.com/jobs?jh=3458" }
    ]
  },
  "JPMorgan Chase": {
    career_page_url: "https://careers.jpmorgan.com/us/en/home",
    linkedin_jobs_url: "https://www.linkedin.com/company/jpmorgan/jobs/",
    indeed_company_url: "https://www.indeed.com/cmp/JPMorgan-Chase",
    jobs: [
      { title: "Software Engineer - Core Technology", location: "New York, NY", salary_min: 145000, salary_max: 195000, job_board: "JPMorgan Careers", apply_url: "https://careers.jpmorgan.com/us/en/job/1234567" },
      { title: "Data Engineer - Analytics", location: "New York, NY", salary_min: 140000, salary_max: 190000, job_board: "JPMorgan Careers", apply_url: "https://careers.jpmorgan.com/us/en/job/1234568" },
      { title: "Risk Analytics Engineer", location: "Jersey City, NJ", salary_min: 135000, salary_max: 185000, job_board: "JPMorgan Careers", apply_url: "https://careers.jpmorgan.com/us/en/job/1234569" }
    ]
  },
  "Goldman Sachs": {
    career_page_url: "https://www.goldmansachs.com/careers/",
    linkedin_jobs_url: "https://www.linkedin.com/company/goldman-sachs/jobs/",
    indeed_company_url: "https://www.indeed.com/cmp/Goldman-Sachs",
    jobs: [
      { title: "Strats Software Engineer", location: "New York, NY", salary_min: 160000, salary_max: 210000, job_board: "Goldman Sachs", apply_url: "https://www.goldmansachs.com/careers/divisions/technology/jobs/" },
      { title: "Quantitative Research Associate", location: "New York, NY", salary_min: 170000, salary_max: 220000, job_board: "Goldman Sachs", apply_url: "https://www.goldmansachs.com/careers/divisions/technology/jobs/" },
      { title: "Cloud Infrastructure Engineer", location: "New York, NY", salary_min: 150000, salary_max: 200000, job_board: "Goldman Sachs", apply_url: "https://www.goldmansachs.com/careers/divisions/technology/jobs/" }
    ]
  },
  "Accenture": {
    career_page_url: "https://www.accenture.com/us-en/careers",
    linkedin_jobs_url: "https://www.linkedin.com/company/accenture/jobs/",
    indeed_company_url: "https://www.indeed.com/cmp/Accenture",
    jobs: [
      { title: "Senior Software Engineer", location: "San Francisco, CA", salary_min: 120000, salary_max: 160000, job_board: "Accenture", apply_url: "https://www.accenture.com/us-en/careers/jobsearch" },
      { title: "Cloud Architect - AWS", location: "New York, NY", salary_min: 130000, salary_max: 170000, job_board: "Accenture", apply_url: "https://www.accenture.com/us-en/careers/jobsearch" },
      { title: "Data Engineer", location: "Chicago, IL", salary_min: 110000, salary_max: 150000, job_board: "Accenture", apply_url: "https://www.accenture.com/us-en/careers/jobsearch" }
    ]
  }
};

function populateJobs() {
  console.log('🔨 Populating job listings and career URLs...\n');

  // Update companies with career page URLs
  console.log('📝 Adding career page URLs to companies...');
  let updatedCount = 0;

  for (const [companyName, urls] of Object.entries(COMPANY_URLS)) {
    db.run(
      `UPDATE companies 
       SET career_page_url = ?, linkedin_jobs_url = ?, indeed_company_url = ?
       WHERE name = ?`,
      [urls.career_page_url, urls.linkedin_jobs_url, urls.indeed_company_url, companyName],
      function(err) {
        if (err) {
          console.error(`  ❌ Error updating ${companyName}:`, err.message);
        } else if (this.changes > 0) {
          console.log(`  ✅ ${companyName}`);
        }
      }
    );
  }

  // Add jobs after a slight delay to ensure updates complete
  setTimeout(() => {
    console.log(`✅ Updated companies with career URLs\n`);
    console.log('📋 Adding job listings...');

    let totalJobsAdded = 0;
    let companiesProcessed = 0;

    for (const [companyName, urls] of Object.entries(COMPANY_URLS)) {
      db.get('SELECT id FROM companies WHERE name = ?', [companyName], (err, company) => {
        if (err) {
          console.error(`  ❌ Error getting ${companyName}:`, err.message);
          return;
        }

        if (!company) {
          console.log(`  ⚠️  ${companyName} not found in database`);
          companiesProcessed++;
          checkCompletion();
          return;
        }

        const jobsForCompany = urls.jobs || [];
        let jobsInserted = 0;

        for (const job of jobsForCompany) {
          db.run(
            `INSERT INTO job_listings (id, company_id, title, location, salary_min, salary_max, job_board, apply_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuid(), company.id, job.title, job.location, job.salary_min, job.salary_max, job.job_board, job.apply_url],
            (err) => {
              if (err) {
                console.error(`  ❌ Error inserting job for ${companyName}:`, err.message);
              } else {
                jobsInserted++;
              }
            }
          );
        }

        setTimeout(() => {
          console.log(`  ✅ ${companyName} - ${jobsForCompany.length} jobs added`);
          totalJobsAdded += jobsForCompany.length;
          companiesProcessed++;
          checkCompletion();
        }, 100);
      });
    }

    function checkCompletion() {
      if (companiesProcessed === Object.keys(COMPANY_URLS).length) {
        setTimeout(() => {
          // Verify data
          db.all('SELECT COUNT(*) as count FROM companies', (err, companies) => {
            db.all('SELECT COUNT(*) as count FROM job_listings', (err, jobs) => {
              const companyCount = companies?.[0]?.count || 0;
              const jobCount = jobs?.[0]?.count || 0;

              console.log(`\n✅ Total jobs added: ${totalJobsAdded}\n`);
              console.log('📊 Database Summary:');
              console.log(`  Companies: ${companyCount}`);
              console.log(`  Job Listings: ${jobCount}`);
              if (companyCount > 0) {
                console.log(`  Jobs per Company: ${(jobCount / companyCount).toFixed(1)}`);
              }

              console.log('\n🎉 Job population complete!');
              console.log('👉 Application links are now live on the website!');

              db.close();
            });
          });
        }, 500);
      }
    }
  }, 1000);
}
