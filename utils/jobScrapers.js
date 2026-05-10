require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

// Greenhouse Job Scraper
async function scrapeGreenhouseJobs(companySlug) {
  try {
    const response = await axios.get(
      `https://boards-api.greenhouse.io/v1/boards/${companySlug}/jobs?content=true`,
      { timeout: 15000 }
    );
    
    return (response.data.jobs || []).map(job => ({
      title: job.title,
      location: job.location?.name || 'Remote',
      applyUrl: job.absolute_url,
      description: job.content || '',
      jobId: job.id
    }));
  } catch (err) {
    console.error(`Greenhouse scrape error for ${companySlug}:`, err.message);
    return [];
  }
}

// Lever Job Scraper
async function scrapeLeverJobs(companySlug) {
  try {
    const response = await axios.get(
      `https://api.lever.co/v0/postings/companies/${companySlug}?limit=100`,
      { timeout: 15000 }
    );
    
    return (response.data || []).map(job => ({
      title: job.text,
      location: job.locations.map(l => l.name).join(', ') || 'Remote',
      applyUrl: job.hostedUrl,
      description: job.description || '',
      jobId: job.id
    }));
  } catch (err) {
    console.error(`Lever scrape error for ${companySlug}:`, err.message);
    return [];
  }
}

// Workday Job Scraper (requires Puppeteer for JavaScript-rendered pages)
async function scrapeWorkdayJobs(companyUrl) {
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    await page.goto(companyUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const jobs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-automation*="jobTitle"]')).map(el => ({
        title: el.textContent.trim(),
        location: el.parentElement.querySelector('[data-automation*="location"]')?.textContent || 'Remote',
        applyUrl: el.getAttribute('href') || '#',
        jobId: el.getAttribute('id') || Math.random().toString(36)
      }));
    });
    
    await browser.close();
    return jobs;
  } catch (err) {
    console.error(`Workday scrape error for ${companyUrl}:`, err.message);
    return [];
  }
}

module.exports = {
  scrapeGreenhouseJobs,
  scrapeLeverJobs,
  scrapeWorkdayJobs
};
