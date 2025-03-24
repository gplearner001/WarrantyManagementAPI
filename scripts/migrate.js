const fs = require('fs-extra');
const path = require('path');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration(client, sql) {
  try {
    await client.query(sql);
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

async function migrate() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');

    // Run migrations in order
    const migrations = [
      'wild_king.sql',
      'quick_fire.sql',
      'fierce_bush.sql'
    ];

    for (const migration of migrations) {
      const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', `20250321113944_${migration}`);
      const sql = await fs.readFile(migrationPath, 'utf8');
      
      console.log(`Running migration: ${migration}`);
      const success = await runMigration(client, sql);
      
      if (!success) {
        throw new Error(`Migration ${migration} failed`);
      }
      console.log(`Migration ${migration} completed successfully`);
    }

    // Commit the transaction
    await client.query('COMMIT');
    console.log('All migrations completed successfully');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);