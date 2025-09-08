-- Add CHECK constraint to ensure at least one storage backend is enabled
-- This constraint is required because Drizzle ORM doesn't handle CHECK constraints in migrations
-- Using idempotent approach to safely re-run this migration

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'user'
      AND c.conname = 'check_storage_backends'
  ) THEN
    ALTER TABLE "user"
    ADD CONSTRAINT check_storage_backends
    CHECK (storage_icp_enabled OR storage_neon_enabled);
    
    RAISE NOTICE 'Added check_storage_backends constraint to user table';
  ELSE
    RAISE NOTICE 'check_storage_backends constraint already exists, skipping';
  END IF;
END$$;
