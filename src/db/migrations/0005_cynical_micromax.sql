ALTER TABLE "memories" ADD COLUMN "storage_locations" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "storage_duration" integer;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "storage_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "gallery" ADD COLUMN "total_memories" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "gallery" ADD COLUMN "storage_locations" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "gallery" ADD COLUMN "average_storage_duration" integer;--> statement-breakpoint
ALTER TABLE "gallery" ADD COLUMN "storage_distribution" json DEFAULT '{}'::json;--> statement-breakpoint
CREATE INDEX "memories_storage_locations_idx" ON "memories" USING btree ("storage_locations");--> statement-breakpoint
CREATE INDEX "memories_storage_duration_idx" ON "memories" USING btree ("storage_duration");--> statement-breakpoint
CREATE INDEX "galleries_storage_locations_idx" ON "gallery" USING btree ("storage_locations");--> statement-breakpoint
CREATE INDEX "galleries_storage_duration_idx" ON "gallery" USING btree ("average_storage_duration");