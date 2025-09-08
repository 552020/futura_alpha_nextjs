CREATE TYPE "public"."storage_pref_t" AS ENUM('neon', 'icp', 'dual');--> statement-breakpoint
ALTER TABLE "document" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-09-08T05:59:35.454Z"}'::json;--> statement-breakpoint
ALTER TABLE "image" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-09-08T05:59:35.453Z"}'::json;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "storage_preference" "storage_pref_t" DEFAULT 'neon' NOT NULL;--> statement-breakpoint
-- Migrate existing data from boolean fields to enum
UPDATE "user" 
SET storage_preference = 
  CASE 
    WHEN storage_icp_enabled = true AND storage_neon_enabled = true THEN 'dual'
    WHEN storage_icp_enabled = true THEN 'icp'
    WHEN storage_neon_enabled = true THEN 'neon'
    ELSE 'neon' -- fallback for any edge cases
  END;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "storage_icp_enabled";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "storage_neon_enabled";