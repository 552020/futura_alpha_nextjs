ALTER TABLE "document" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-24T12:47:25.926Z"}'::json;--> statement-breakpoint
ALTER TABLE "image" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-24T12:47:25.925Z"}'::json;--> statement-breakpoint
ALTER TABLE "audio" ADD COLUMN "parent_folder_id" text;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "parent_folder_id" text;--> statement-breakpoint
ALTER TABLE "image" ADD COLUMN "parent_folder_id" text;--> statement-breakpoint
ALTER TABLE "note" ADD COLUMN "parent_folder_id" text;--> statement-breakpoint
ALTER TABLE "video" ADD COLUMN "parent_folder_id" text;