CREATE TYPE "public"."artifact_t" AS ENUM('metadata', 'asset');--> statement-breakpoint
CREATE TYPE "public"."backend_t" AS ENUM('neon-db', 'vercel-blob', 'icp-canister');--> statement-breakpoint
CREATE TYPE "public"."memory_type_t" AS ENUM('image', 'video', 'note', 'document', 'audio');--> statement-breakpoint
CREATE TYPE "public"."sync_t" AS ENUM('idle', 'migrating', 'failed');--> statement-breakpoint
ALTER TABLE "document" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-31T13:42:10.614Z"}'::json;--> statement-breakpoint
ALTER TABLE "image" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-31T13:42:10.613Z"}'::json;