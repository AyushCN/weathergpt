-- WeatherGPT Database Initialization
-- This script runs on first PostgreSQL container startup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes for better performance
-- These will be created by SQLAlchemy but we add some extra ones

-- Note: Tables are created by SQLAlchemy models on backend startup
-- This file is for any additional database setup

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE weathergpt TO weathergpt;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO weathergpt;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO weathergpt;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO weathergpt;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO weathergpt;