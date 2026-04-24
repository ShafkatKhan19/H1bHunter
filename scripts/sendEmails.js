#!/usr/bin/env node

/**
 * H1BHunter Job Alert Email Service
 * Runs daily at 8am to send job alerts
 */

require('dotenv').config();
const nodemailer = require('nodemailer');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data/h1bhunter.db'));

// Check if email is configured
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('⚠️  EMAIL_USER or EMAIL_PASS not configured. Skipping email alerts.');
  console.warn('Set these in .env or Railway Variables to enable job alerts.');
  process.exit(0);
}

// Configure email service (Gmail SMTP - completely free)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendDailyJobAlerts() {
  console.log('📧 Sending daily job alerts...');

  try {
    // Get active job alerts
    const alerts = db.prepare(`
      SELECT DISTINCT ja.*, u.email, u.first_name
      FROM job_alerts ja
      JOIN users u ON ja.user_id = u.id
      WHERE ja.is_active = 1
    `).all();

    console.log(`Found ${alerts.length} active alerts`);

    for (const alert of alerts) {
      // Get recent jobs matching alert criteria
      const jobs = db.prepare(`
        SELECT jl.*, c.name as company_name, c.trust_score
        FROM job_listings jl
        JOIN companies c ON jl.company_id = c.id
        WHERE c.industry LIKE ?
        AND jl.location LIKE ?
        AND jl.scraped_at > datetime('now', '-1 day')
        LIMIT 10
      `).all(`%${alert.field_of_study}%`, `%${alert.target_location}%`);

      if (jobs.length === 0) {
        console.log(`No jobs found for ${alert.email} - skipping`);
        continue;
      }

      // Build email
      const htmlContent = buildEmailHtml(alert, jobs);

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: alert.email,
          subject: `🌊 H1BHunter Daily Alert: ${jobs.length} new jobs in ${alert.field_of_study}`,
          html: htmlContent
        });

        console.log(`✅ Sent alert to ${alert.email} (${jobs.length} jobs)`);
      } catch (err) {
        console.error(`❌ Failed to send email to ${alert.email}:`, err.message);
      }
    }

    console.log('✨ Daily alerts sent!');
  } catch (err) {
    console.error('❌ Alert service failed:', err);
  }
}

function buildEmailHtml(alert, jobs) {
  const jobsHtml = jobs.map(job => `
    <tr style="border-bottom: 1px solid #2a2a3a;">
      <td style="padding: 1rem; text-align: left;">
        <strong>${escapeHtml(job.title)}</strong><br>
        <span style="color: #4f8ef7;">${escapeHtml(job.company_name)}</span><br>
        <span style="color: #b0b0c0; font-size: 0.9em;">${escapeHtml(job.location)}</span>
      </td>
      <td style="padding: 1rem;">
        $${job.salary_min ? job.salary_min.toLocaleString() : 'N/A'} - $${job.salary_max ? job.salary_max.toLocaleString() : 'N/A'}
      </td>
      <td style="padding: 1rem; text-align: center;">
        <a href="${job.apply_url}" style="background: #4f8ef7; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 6px; display: inline-block;">Apply</a>
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { background: #0a0a0f; color: #ffffff; font-family: Inter, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; background: #13131a; border: 1px solid #2a2a3a; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #4f8ef7 0%, #3d7ce0 100%); padding: 2rem; text-align: center; }
        .header h1 { margin: 0; font-size: 1.8rem; }
        .content { padding: 2rem; }
        .jobs-table { width: 100%; border-collapse: collapse; }
        .footer { background: #0a0a0f; padding: 1rem; text-align: center; color: #b0b0c0; font-size: 0.85em; }
        a { color: #4f8ef7; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌊 H1BHunter</h1>
          <p>Your Daily Job Alert</p>
        </div>

        <div class="content">
          <p>Hi ${escapeHtml(alert.first_name || 'there')},</p>
          
          <p>We found <strong>${jobs.length} new job${jobs.length > 1 ? 's' : ''}</strong> in ${escapeHtml(alert.field_of_study)} at H-1B sponsoring companies near ${escapeHtml(alert.target_location)}!</p>

          <table class="jobs-table">
            <thead>
              <tr style="background: #2a2a3a;">
                <th style="padding: 1rem; text-align: left;">Position</th>
                <th style="padding: 1rem;">Salary</th>
                <th style="padding: 1rem;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${jobsHtml}
            </tbody>
          </table>

          <p style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #2a2a3a;">
            <a href="https://h1bhunter.com">Visit H1BHunter</a> to explore more companies and save your favorites.
          </p>

          <p style="color: #b0b0c0; font-size: 0.9em;">
            <strong>Pro Tip:</strong> Premium members get unlimited job alerts. <a href="https://h1bhunter.com/upgrade">Upgrade now</a> to get alerts for multiple fields and locations.
          </p>
        </div>

        <div class="footer">
          <p>© 2024 H1BHunter. Built for international students by Poseidon.</p>
          <p><a href="#">Unsubscribe</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Run email service
sendDailyJobAlerts().catch(console.error);
