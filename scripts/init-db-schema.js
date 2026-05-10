#!/usr/bin/env node

/**
 * Initialize Database Schema
 * Creates missing tables if they don't exist
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'h1bhunter.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database\n');
  initializeSchema();
});

function initializeSchema() {
  console.log('🔧 Initializing database schema...\n');

  const schemas = [
    {
      name: 'job_listings',
      sql: `
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
      `
    },
    {
      name: 'job_alerts',
      sql: `
        CREATE TABLE IF NOT EXISTS job_alerts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          field_of_study TEXT NOT NULL,
          target_location TEXT NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `
    },
    {
      name: 'opt_tracker',
      sql: `
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
      `
    },
    {
      name: 'saved_companies',
      sql: `
        CREATE TABLE IF NOT EXISTS saved_companies (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          company_id TEXT NOT NULL,
          saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (company_id) REFERENCES companies(id)
        )
      `
    }
  ];

  let completed = 0;

  schemas.forEach(schema => {
    db.run(schema.sql, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error(`❌ Error creating ${schema.name}:`, err.message);
      } else {
        console.log(`✅ ${schema.name} table ready`);
      }
      completed++;

      if (completed === schemas.length) {
        // Verify tables exist
        setTimeout(() => {
          console.log('\n📋 Verifying tables...\n');
          db.all(
            "SELECT name FROM sqlite_master WHERE type='table'",
            (err, tables) => {
              if (err) {
                console.error('❌ Error listing tables:', err);
              } else {
                const tableNames = tables.map(t => t.name);
                console.log('Database tables:');
                tableNames.forEach(t => console.log(`  • ${t}`));
                console.log('\n✅ Schema initialization complete!');
              }
              db.close();
            }
          );
        }, 500);
      }
    });
  });
}
