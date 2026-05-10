# H1BHunter Feature Build - Complete Instructions

**Date:** May 7, 2026
**Status:** Ready to implement
**Scope:** Navigation overhaul, paywall system, Jobs page, Resume builder, Dashboard

## Summary of Changes

This build adds:
1. Clean navigation tabs (removing all emojis)
2. Paywall UI for Search results (blurred approval rates, 5-result limit for free users)
3. Jobs page with job scraping from Workday/Greenhouse/Lever + Claude API analysis
4. Resume builder with multi-step flow, file upload/parsing, Claude API rewriting
5. Dashboard showing account info, subscription status, saved companies, job history
6. Stripe payment gating for premium features

## Files to Create/Update

### CREATE NEW FILES:
```
utils/claudeApi.js           - Claude API wrapper for job analysis & resume
utils/jobScrapers.js         - Greenhouse & Lever scraping (Workday via Puppeteer)
utils/resumeGenerator.js     - Resume parsing (PDF/Word) and .docx generation
utils/paymentGating.js       - Stripe payment confirmation for resume attempts
public/pages/search.html     - Search page template
public/pages/jobs.html       - Jobs page template
public/pages/resume.html     - Resume builder page template  
public/pages/dashboard.html  - Dashboard page template
public/styles-paywall.css    - Paywall UI styles (modals, locked states, tabs)
```

### UPDATE EXISTING FILES:
```
server.js                    - Add new endpoints (resume, dashboard, stripe hooks)
package.json                 - Verify dependencies (@anthropic-ai/sdk, docx, etc.)
public/index.html            - Add navigation tabs, page container
public/app.js                - Add page routing, paywall logic
public/styles.css            - Integrate new styles
.env.example                 - Add ANTHROPIC_API_KEY
```

## Implementation Steps

### Step 1: Install Puppeteer (for Workday scraping)
```bash
npm install puppeteer
```

### Step 2: Update .env
Add this line to your .env file:
```
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

### Step 3: Create utility files (see below)

### Step 4: Update server.js with new endpoints

### Step 5: Update HTML/CSS with new navigation and pages

### Step 6: Test and deploy to Render

---

## Detailed Code Changes

### NEW FILE: utils/claudeApi.js
```javascript
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Analyze job for international student safety
async function analyzeJobForInternationalStudents(jobDescription, jobTitle) {
  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Analyze this job posting for international student safety. 

Job Title: ${jobTitle}

Job Description:
${jobDescription}

Check for:
1. Mentions of H-1B sponsorship, visa sponsorship, or work authorization
2. Mentions of OPT, CPT, or international student restrictions
3. Any language that welcomes or restricts international applicants

Respond in this exact format:
SAFETY_LEVEL: [SAFE|RISKY|UNCLEAR]
REASON: [2-3 sentences explaining the safety assessment]
KEY_FINDINGS: [Comma-separated list of relevant mentions found]`
      }]
    });

    const content = message.content[0].text;
    const safetyMatch = content.match(/SAFETY_LEVEL: (.*)/);
    const reasonMatch = content.match(/REASON: (.*)/);
    const findingsMatch = content.match(/KEY_FINDINGS: (.*)/);

    return {
      safetyLevel: safetyMatch ? safetyMatch[1].trim() : 'UNCLEAR',
      reason: reasonMatch ? reasonMatch[1].trim() : 'Unable to determine',
      findings: findingsMatch ? findingsMatch[1].trim() : 'No specific findings'
    };
  } catch (err) {
    console.error('Claude API error:', err);
    return {
      safetyLevel: 'UNCLEAR',
      reason: 'Analysis not available',
      findings: 'Error during analysis'
    };
  }
}

// Extract job requirements
async function extractJobRequirements(jobDescription) {
  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Extract the key requirements from this job posting. Return as a comma-separated list of 5-10 most important skills and qualifications.

${jobDescription}

Just return the list, nothing else.`
      }]
    });

    return message.content[0].text.split(',').map(r => r.trim()).filter(r => r);
  } catch (err) {
    console.error('Error extracting requirements:', err);
    return [];
  }
}

// Compare resume to job and suggest improvements
async function generateResumeImprovements(jobDescription, resumeContent, section) {
  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `You are a professional resume writer. Compare the candidate's resume to the job requirements and suggest improvements for the ${section} section.

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME (${section.toUpperCase()} SECTION):
${resumeContent}

Provide an improved version of the ${section} section that:
1. Incorporates keywords and requirements from the job
2. Demonstrates relevant experience/skills for this specific role
3. Is professional and impactful
4. Maintains authentic information

Return ONLY the improved section, no explanations.`
      }]
    });

    return message.content[0].text;
  } catch (err) {
    console.error('Error generating resume:', err);
    return resumeContent; // Return original if error
  }
}

// Gap analysis
async function generateGapAnalysis(jobDescription, resumeContent) {
  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Analyze the gaps between this job posting and the candidate's resume.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S RESUME:
${resumeContent}

Identify:
1. Missing skills or qualifications
2. Weak areas that need strengthening
3. Key requirements not clearly demonstrated
4. Recommendations for improvement

Format as:
MISSING_SKILLS: [list]
WEAK_AREAS: [list]
RECOMMENDATIONS: [list]`
      }]
    });

    const content = message.content[0].text;
    const skillsMatch = content.match(/MISSING_SKILLS: (.*?)(?=\n|WEAK_AREAS)/s);
    const weakMatch = content.match(/WEAK_AREAS: (.*?)(?=\n|RECOMMENDATIONS)/s);
    const recsMatch = content.match(/RECOMMENDATIONS: (.*)/s);

    return {
      missingSkills: skillsMatch ? skillsMatch[1].trim() : '',
      weakAreas: weakMatch ? weakMatch[1].trim() : '',
      recommendations: recsMatch ? recsMatch[1].trim() : ''
    };
  } catch (err) {
    console.error('Error generating gap analysis:', err);
    return {
      missingSkills: 'Analysis unavailable',
      weakAreas: 'Analysis unavailable',
      recommendations: 'Analysis unavailable'
    };
  }
}

module.exports = {
  analyzeJobForInternationalStudents,
  extractJobRequirements,
  generateResumeImprovements,
  generateGapAnalysis
};
```

### NEW FILE: utils/jobScrapers.js
```javascript
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
```

### NEW FILE: utils/resumeGenerator.js
```javascript
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { Document, Packer, Paragraph, TextRun, convertInchesToTwip } = require('docx');

// Parse PDF resume
async function parsePDFResume(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (err) {
    console.error('PDF parse error:', err);
    throw new Error('Failed to parse PDF resume');
  }
}

// Parse Word resume
async function parseWordResume(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (err) {
    console.error('Word parse error:', err);
    throw new Error('Failed to parse Word resume');
  }
}

// Parse any resume format
async function parseResume(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    return parsePDFResume(filePath);
  } else if (ext === '.docx' || ext === '.doc') {
    return parseWordResume(filePath);
  } else {
    throw new Error('Unsupported file format. Use PDF or Word.');
  }
}

// Generate Word document from resume sections
async function generateResumeDocument(sections) {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: 'RESUME',
          bold: true,
          size: 28,
          spacing: { after: 200 }
        }),
        
        // Summary
        ...(sections.summary ? [
          new Paragraph({
            text: 'PROFESSIONAL SUMMARY',
            bold: true,
            size: 22,
            spacing: { before: 200, after: 100 },
            border: { bottom: { color: '4f8ef7', space: 1, style: 'single', size: 6 } }
          }),
          new Paragraph({
            text: sections.summary,
            spacing: { after: 200 }
          })
        ] : []),
        
        // Skills
        ...(sections.skills ? [
          new Paragraph({
            text: 'SKILLS',
            bold: true,
            size: 22,
            spacing: { before: 200, after: 100 },
            border: { bottom: { color: '4f8ef7', space: 1, style: 'single', size: 6 } }
          }),
          new Paragraph({
            text: sections.skills,
            spacing: { after: 200 }
          })
        ] : []),
        
        // Experience
        ...(sections.experience ? [
          new Paragraph({
            text: 'EXPERIENCE',
            bold: true,
            size: 22,
            spacing: { before: 200, after: 100 },
            border: { bottom: { color: '4f8ef7', space: 1, style: 'single', size: 6 } }
          }),
          new Paragraph({
            text: sections.experience,
            spacing: { after: 200 }
          })
        ] : []),
        
        // Education
        ...(sections.education ? [
          new Paragraph({
            text: 'EDUCATION',
            bold: true,
            size: 22,
            spacing: { before: 200, after: 100 },
            border: { bottom: { color: '4f8ef7', space: 1, style: 'single', size: 6 } }
          }),
          new Paragraph({
            text: sections.education,
            spacing: { after: 200 }
          })
        ] : [])
      ]
    }]
  });

  return await Packer.toBuffer(doc);
}

module.exports = {
  parseResume,
  generateResumeDocument
};
```

Now I need to provide guidance on updating the existing files. Let me create that:

