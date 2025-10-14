-- Initialize Futura Development Database
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create additional databases for testing
CREATE DATABASE futura_test;
CREATE DATABASE futura_staging;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE futura_dev TO futura_user;
GRANT ALL PRIVILEGES ON DATABASE futura_test TO futura_user;
GRANT ALL PRIVILEGES ON DATABASE futura_staging TO futura_user;

-- Create a simple health check function
CREATE OR REPLACE FUNCTION health_check()
RETURNS TEXT AS $$
BEGIN
    RETURN 'Database is healthy';
END;
$$ LANGUAGE plpgsql;
