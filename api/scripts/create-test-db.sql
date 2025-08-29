-- Create test database for e2e tests
-- Run this script as a PostgreSQL superuser

-- Create test database
CREATE DATABASE stockplay_test;

-- Grant permissions to the application user
GRANT ALL PRIVILEGES ON DATABASE stockplay_test TO postgres;

-- Connect to the test database
\c stockplay_test;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant permissions on extensions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
