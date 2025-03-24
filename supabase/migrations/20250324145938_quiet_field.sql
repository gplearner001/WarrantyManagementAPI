/*
  # Initial Database Schema Setup

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `password_hash` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `user_mappings`
      - `uuid` (uuid, primary key)
      - `oauth_id` (text)
      - `user_id` (text)
      - `created_at` (timestamptz)

    - `warranties`
      - `warranty_id` (uuid, primary key)
      - `user_id` (uuid, references user_mappings)
      - `product_name` (text)
      - `company_name` (text)
      - `purchase_date` (date)
      - `expiry_date` (date)
      - `additional_info` (text)
      - `receipt_image_url` (text)
      - `product_image_url` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Indexes
    - Email index on users table
    - OAuth ID index on user_mappings table
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_mappings table
CREATE TABLE IF NOT EXISTS user_mappings (
  uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oauth_id text NOT NULL,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create warranties table
CREATE TABLE IF NOT EXISTS warranties (
  warranty_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_mappings(uuid),
  product_name text NOT NULL,
  company_name text NOT NULL,
  purchase_date date NOT NULL,
  expiry_date date NOT NULL,
  additional_info text,
  receipt_image_url text NOT NULL,
  product_image_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_mappings_oauth_id ON user_mappings(oauth_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warranties_updated_at
  BEFORE UPDATE ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();