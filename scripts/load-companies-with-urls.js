#!/usr/bin/env node

/**
 * H1BHunter - Load Real H-1B Companies with Application URLs
 * Run: node scripts/load-companies-with-urls.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'h1bhunter.db');
const db = new sqlite3.Database(dbPath);

// Real H-1B companies with URLs
const COMPANIES_WITH_URLS = [
  { name: "Google", career_page_url: "https://careers.google.com", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=google", indeed_company_url: "https://www.indeed.com/cmp/Google/jobs" },
  { name: "Amazon", career_page_url: "https://www.amazon.jobs", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=amazon", indeed_company_url: "https://www.indeed.com/cmp/Amazon.com/jobs" },
  { name: "Microsoft", career_page_url: "https://careers.microsoft.com", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=microsoft", indeed_company_url: "https://www.indeed.com/cmp/Microsoft/jobs" },
  { name: "Apple", career_page_url: "https://www.apple.com/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=apple", indeed_company_url: "https://www.indeed.com/cmp/Apple/jobs" },
  { name: "Meta", career_page_url: "https://www.metacareers.com", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=meta", indeed_company_url: "https://www.indeed.com/cmp/Meta-Platforms/jobs" },
  { name: "Nvidia", career_page_url: "https://www.nvidia.com/en-us/about-nvidia/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=nvidia", indeed_company_url: "https://www.indeed.com/cmp/Nvidia/jobs" },
  { name: "Tesla", career_page_url: "https://www.tesla.com/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=tesla", indeed_company_url: "https://www.indeed.com/cmp/Tesla/jobs" },
  { name: "Intel", career_page_url: "https://www.intel.com/content/www/us/en/jobs.html", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=intel", indeed_company_url: "https://www.indeed.com/cmp/Intel/jobs" },
  { name: "Salesforce", career_page_url: "https://www.salesforce.com/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=salesforce", indeed_company_url: "https://www.indeed.com/cmp/Salesforce/jobs" },
  { name: "Oracle", career_page_url: "https://www.oracle.com/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=oracle", indeed_company_url: "https://www.indeed.com/cmp/Oracle/jobs" },
  { name: "IBM", career_page_url: "https://www.ibm.com/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=ibm", indeed_company_url: "https://www.indeed.com/cmp/IBM/jobs" },
  { name: "JPMorgan Chase", career_page_url: "https://careers.jpmorgan.com", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=jpmorgan", indeed_company_url: "https://www.indeed.com/cmp/JPMorgan-Chase/jobs" },
  { name: "Goldman Sachs", career_page_url: "https://www.goldmansachs.com/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=goldman", indeed_company_url: "https://www.indeed.com/cmp/Goldman-Sachs/jobs" },
  { name: "Morgan Stanley", career_page_url: "https://www.morganstanley.com/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=morgan", indeed_company_url: "https://www.indeed.com/cmp/Morgan-Stanley/jobs" },
  { name: "Citigroup", career_page_url: "https://www.citigroup.com/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=citigroup", indeed_company_url: "https://www.indeed.com/cmp/Citigroup/jobs" },
  { name: "Bank of America", career_page_url: "https://careers.bankofamerica.com", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=bank", indeed_company_url: "https://www.indeed.com/cmp/Bank-of-America/jobs" },
  { name: "Accenture", career_page_url: "https://www.accenture.com/us-en/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=accenture", indeed_company_url: "https://www.indeed.com/cmp/Accenture/jobs" },
  { name: "Deloitte", career_page_url: "https://www.deloitte.com/global/en/careers.html", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=deloitte", indeed_company_url: "https://www.indeed.com/cmp/Deloitte/jobs" },
  { name: "Capgemini", career_page_url: "https://www.capgemini.com/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=capgemini", indeed_company_url: "https://www.indeed.com/cmp/Capgemini/jobs" },
  { name: "Infosys", career_page_url: "https://www.infosys.com/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=infosys", indeed_company_url: "https://www.indeed.com/cmp/Infosys/jobs" },
  { name: "Tata Consultancy Services", career_page_url: "https://www.tcs.com/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=tcs", indeed_company_url: "https://www.indeed.com/cmp/Tata-Consultancy-Services/jobs" },
  { name: "Wipro", career_page_url: "https://careers.wipro.com", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=wipro", indeed_company_url: "https://www.indeed.com/cmp/Wipro/jobs" },
  { name: "Cognizant", career_page_url: "https://www.cognizant.com/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=cognizant", indeed_company_url: "https://www.indeed.com/cmp/Cognizant/jobs" },
  { name: "HCL Technologies", career_page_url: "https://www.hcltech.com/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=hcl", indeed_company_url: "https://www.indeed.com/cmp/HCL-Technologies/jobs" },
  { name: "Adobe", career_page_url: "https://www.adobe.com/careers.html", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=adobe", indeed_company_url: "https://www.indeed.com/cmp/Adobe/jobs" },
  { name: "Stripe", career_page_url: "https://stripe.com/jobs", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=stripe", indeed_company_url: "https://www.indeed.com/cmp/Stripe/jobs" },
  { name: "Airbnb", career_page_url: "https://www.airbnb.com/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=airbnb", indeed_company_url: "https://www.indeed.com/cmp/Airbnb/jobs" },
  { name: "Uber", career_page_url: "https://www.uber.com/en-US/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=uber", indeed_company_url: "https://www.indeed.com/cmp/Uber/jobs" },
  { name: "Netflix", career_page_url: "https://jobs.netflix.com", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=netflix", indeed_company_url: "https://www.indeed.com/cmp/Netflix/jobs" },
  { name: "Shopify", career_page_url: "https://www.shopify.com/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=shopify", indeed_company_url: "https://www.indeed.com/cmp/Shopify/jobs" },
  { name: "Twilio", career_page_url: "https://www.twilio.com/en-us/company/careers", linkedin_jobs_url: "https://www.linkedin.com/jobs/search/?keywords=twilio", indeed_company_url: "https://www.indeed.com/cmp/Twilio/jobs" }
];

function loadURLs() {
  console.log('🌊 Updating H-1B companies with application URLs...\n');

  db.serialize(() => {
    let updated = 0;
    
    COMPANIES_WITH_URLS.forEach((company) => {
      db.run(
        `UPDATE companies SET career_page_url = ?, linkedin_jobs_url = ?, indeed_company_url = ?, last_updated = ? WHERE name = ?`,
        [company.career_page_url, company.linkedin_jobs_url, company.indeed_company_url, new Date().toISOString(), company.name],
        function(err) {
          if (err) {
            console.error(`❌ ${company.name}:`, err.message);
          } else if (this.changes > 0) {
            console.log(`✅ ${company.name}`);
            updated++;
          }
        }
      );
    });

    // Final summary
    setTimeout(() => {
      db.get('SELECT COUNT(*) as count FROM companies WHERE career_page_url IS NOT NULL', (err, row) => {
        if (err) {
          console.error('Error:', err);
        } else {
          console.log(`\n📊 Summary: ${row.count} companies now have application links`);
          db.close();
        }
      });
    }, 500);
  });
}

loadURLs();
