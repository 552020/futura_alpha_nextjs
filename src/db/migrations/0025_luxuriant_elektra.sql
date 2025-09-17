ALTER TYPE "public"."storage_pref_t" ADD VALUE 's3';--> statement-breakpoint
ALTER TYPE "public"."storage_pref_t" ADD VALUE 'vercel-blob';--> statement-breakpoint
ALTER TABLE "document" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-09-15T18:22:20.082Z"}'::json;--> statement-breakpoint
ALTER TABLE "image" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-09-15T18:22:20.080Z"}'::json;--> statement-breakpoint
ALTER TABLE "video" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-09-15T18:22:20.082Z"}'::json;