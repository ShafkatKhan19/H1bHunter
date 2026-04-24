#!/usr/bin/env node

/**
 * H1BHunter Cron Job Scheduler
 * Manages scheduled tasks: scraping, email alerts, monitoring
 */

require('dotenv').config();
const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Create logs directory
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

console.log('🌊 H1BHunter Cron Scheduler Starting...\n');

// Job 1: Scrape H-1B data daily at 3am
// Cron: 0 3 * * * (3:00 AM every day)
cron.schedule('0 3 * * *', () => {
  console.log(`\n⏰ [${new Date().toISOString()}] Running data scrape job...`);
  
  exec('node ' + path.join(__dirname, 'scrape.js'), (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Scrape error: ${error.message}`);
      logToFile(`SCRAPE ERROR: ${error.message}`);
      return;
    }
    console.log(stdout);
    logToFile(`SCRAPE SUCCESS: ${stdout}`);
  });
});

// Job 2: Send daily job alerts at 8am (only if email is configured)
// Cron: 0 8 * * * (8:00 AM every day)
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  cron.schedule('0 8 * * *', () => {
    console.log(`\n⏰ [${new Date().toISOString()}] Running job alert email service...`);
    
    exec('node ' + path.join(__dirname, 'sendEmails.js'), (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Email service error: ${error.message}`);
        logToFile(`EMAIL ERROR: ${error.message}`);
        return;
      }
      console.log(stdout);
      logToFile(`EMAIL SUCCESS: ${stdout}`);
    });
  });
} else {
  console.log('⚠️  Email alerts disabled (EMAIL_USER/PASS not set)');
}

// Job 3: Generate status report every 6 hours
// Cron: 0 */6 * * * (Every 6 hours)
cron.schedule('0 */6 * * *', () => {
  console.log(`\n⏰ [${new Date().toISOString()}] Generating status report...`);
  
  exec('node ' + path.join(__dirname, 'monitor.js'), (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Monitor error: ${error.message}`);
      logToFile(`MONITOR ERROR: ${error.message}`);
      return;
    }
    console.log(stdout);
    logToFile(`MONITOR SUCCESS: ${stdout}`);
  });
});

// Optional: Initial run on startup (for testing)
if (process.argv.includes('--initial')) {
  console.log('🚀 Running initial jobs...\n');
  
  exec('node ' + path.join(__dirname, 'scrape.js'), (error, stdout, stderr) => {
    if (error) console.error(error);
    else console.log(stdout);
  });

  setTimeout(() => {
    exec('node ' + path.join(__dirname, 'monitor.js'), (error, stdout, stderr) => {
      if (error) console.error(error);
      else console.log(stdout);
    });
  }, 2000);
}

function logToFile(message) {
  const logFile = path.join(logsDir, 'cron.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

console.log('\n✅ Cron scheduler initialized with following jobs:');
console.log('  • Data Scrape: 3:00 AM daily');
console.log('  • Job Alerts Email: 8:00 AM daily');
console.log('  • Status Report: Every 6 hours\n');
console.log('Press Ctrl+C to stop.\n');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down cron scheduler...');
  process.exit(0);
});
