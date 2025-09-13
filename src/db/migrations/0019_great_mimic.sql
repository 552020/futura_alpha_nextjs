CREATE TABLE "storage_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memory_id" uuid NOT NULL,
	"memory_type" "memory_type_t" NOT NULL,
	"artifact" "artifact_t" NOT NULL,
	"backend" "backend_t" NOT NULL,
	"present" boolean DEFAULT false NOT NULL,
	"location" text,
	"content_hash" text,
	"size_bytes" bigint,
	"sync_state" "sync_t" DEFAULT 'idle' NOT NULL,
	"last_synced_at" timestamp,
	"sync_error" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "document" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-31T13:43:48.752Z"}'::json;--> statement-breakpoint
ALTER TABLE "image" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-31T13:43:48.751Z"}'::json;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_edge" ON "storage_edges" USING btree ("memory_id","memory_type","artifact","backend");