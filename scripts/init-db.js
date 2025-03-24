const { Pool } = require('pg');
const path = require('path');
const fs = require('fs').promises;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function tableExists(client, tableName) {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `, [tableName]);
  return result.rows[0].exists;
}

async function initDb() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database initialization');
    
    // Check if main tables exist
    const usersExist = await tableExists(client, 'users');
    const userMappingsExist = await tableExists(client, 'user_mappings');
    const warrantiesExist = await tableExists(client, 'warranties');

    if (usersExist && userMappingsExist && warrantiesExist) {
      console.log('Database tables already exist, skipping initialization');
      return;
    }

    // Read and execute migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250324151002_calm_butterfly.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');

    await client.query('BEGIN');

    // Split SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    for (const statement of statements) {
      try {
        await client.query(statement + ';');
      } catch (error) {
        // Ignore errors for existing objects
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    await client.query('COMMIT');
    console.log('Database initialization completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initDb().catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});