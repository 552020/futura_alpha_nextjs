-- Seed development data
-- This script adds some basic test data for local development

-- Note: This will be populated by your Drizzle migrations and seed scripts
-- This file is here for any additional SQL that needs to run after migrations

-- Create a development user (if not exists)
INSERT INTO "user" (id, name, email, username, role, plan, created_at, updated_at)
VALUES (
    'dev-user-123',
    'Development User',
    'dev@futura.local',
    'devuser',
    'admin',
    'premium',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create a test all_user record
INSERT INTO all_user (id, type, user_id, created_at)
VALUES (
    'all-user-dev-123',
    'user',
    'dev-user-123',
    NOW()
) ON CONFLICT (id) DO NOTHING;
