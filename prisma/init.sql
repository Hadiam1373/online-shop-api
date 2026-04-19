-- PostgreSQL initialization script
-- This script is executed when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set default timezone
SET timezone = 'UTC';

-- Create schema for organizing tables (optional)
CREATE SCHEMA IF NOT EXISTS public;

-- Verify database is created and ready
SELECT now() as database_initialized_at;

-- Add any initial data or triggers here as needed