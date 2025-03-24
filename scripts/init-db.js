const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const schema = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS warranties CASCADE;
DROP TABLE IF EXISTS user_mappings CASCADE;

-- User Mappings Table
CREATE TABLE user_mappings (
  uuid uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  oauth_id text UNIQUE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Warranties Table
CREATE TABLE warranties (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  warranty_id uuid UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES user_mappings(uuid),
  product_name text NOT NULL,
  company_name text NOT NULL,
  purchase_date date NOT NULL,
  expiry_date date NOT NULL,
  additional_info text,
  receipt_image_url text NOT NULL,
  product_image_url text NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_user_mappings_oauth_id ON user_mappings(oauth_id);
CREATE INDEX idx_warranties_user_id ON warranties(user_id);
CREATE INDEX idx_warranties_warranty_id ON warranties(warranty_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_warranties_updated_at
  BEFORE UPDATE ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`;

async function initDb() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database initialization');
    await client.query('BEGIN');
    await client.query(schema);
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