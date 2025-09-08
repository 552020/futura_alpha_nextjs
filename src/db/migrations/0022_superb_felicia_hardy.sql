ALTER TABLE "document" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-09-07T22:12:41.842Z"}'::json;--> statement-breakpoint
ALTER TABLE "image" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-09-07T22:12:41.839Z"}'::json;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "storage_icp_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "storage_neon_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "storage_primary_storage" "backend_t" DEFAULT 'neon-db' NOT NULL;--> statement-breakpoint
CREATE INDEX "accounts_user_provider_idx" ON "account" USING btree ("userId","provider");--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "account" USING btree ("userId");