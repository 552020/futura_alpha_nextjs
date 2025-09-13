ALTER TABLE "document" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-28T08:31:18.866Z"}'::json;--> statement-breakpoint
ALTER TABLE "image" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-28T08:31:18.865Z"}'::json;--> statement-breakpoint
CREATE INDEX "ii_nonces_used_idx" ON "ii_nonce" USING btree ("used_at");--> statement-breakpoint
CREATE INDEX "ii_nonces_active_idx" ON "ii_nonce" USING btree ("used_at","expires_at");--> statement-breakpoint
CREATE INDEX "ii_nonces_created_idx" ON "ii_nonce" USING btree ("created_at");