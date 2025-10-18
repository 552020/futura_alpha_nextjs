-- Convert existing single enum values to JSONB arrays
-- First, add temporary columns
ALTER TABLE "user_hosting_preferences" ADD COLUMN "database_hosting_new" jsonb DEFAULT '["neon"]'::jsonb;
ALTER TABLE "user_hosting_preferences" ADD COLUMN "blob_hosting_new" jsonb DEFAULT '["s3"]'::jsonb;

-- Convert existing data: wrap single values in arrays
UPDATE "user_hosting_preferences" 
SET "database_hosting_new" = jsonb_build_array("database_hosting")
WHERE "database_hosting" IS NOT NULL;

UPDATE "user_hosting_preferences" 
SET "blob_hosting_new" = jsonb_build_array("blob_hosting")
WHERE "blob_hosting" IS NOT NULL;

-- Drop old columns
ALTER TABLE "user_hosting_preferences" DROP COLUMN "database_hosting";
ALTER TABLE "user_hosting_preferences" DROP COLUMN "blob_hosting";

-- Rename new columns to original names
ALTER TABLE "user_hosting_preferences" RENAME COLUMN "database_hosting_new" TO "database_hosting";
ALTER TABLE "user_hosting_preferences" RENAME COLUMN "blob_hosting_new" TO "blob_hosting";

-- Set NOT NULL constraints
ALTER TABLE "user_hosting_preferences" ALTER COLUMN "database_hosting" SET NOT NULL;
ALTER TABLE "user_hosting_preferences" ALTER COLUMN "blob_hosting" SET NOT NULL;