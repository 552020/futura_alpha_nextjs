CREATE TABLE "ii_nonce" (
	"id" text PRIMARY KEY NOT NULL,
	"nonce_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"context" json DEFAULT '{}'::json
);
--> statement-breakpoint
ALTER TABLE "document" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-28T07:22:44.297Z"}'::json;--> statement-breakpoint
ALTER TABLE "image" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-28T07:22:44.296Z"}'::json;--> statement-breakpoint
CREATE INDEX "ii_nonces_hash_idx" ON "ii_nonce" USING btree ("nonce_hash");--> statement-breakpoint
CREATE INDEX "ii_nonces_expires_idx" ON "ii_nonce" USING btree ("expires_at");