ALTER TYPE "public"."blob_hosting_t" ADD VALUE 'neon';--> statement-breakpoint
ALTER TABLE "memory_assets" RENAME COLUMN "storage_backend" TO "asset_location";--> statement-breakpoint
DROP INDEX "memories_storage_locations_idx";--> statement-breakpoint
DROP INDEX "galleries_storage_locations_idx";--> statement-breakpoint
DROP INDEX "memory_assets_storage_idx";--> statement-breakpoint
CREATE INDEX "memory_assets_storage_idx" ON "memory_assets" USING btree ("asset_location","storage_key");--> statement-breakpoint
ALTER TABLE "memories" DROP COLUMN "storage_locations";--> statement-breakpoint
ALTER TABLE "memories" DROP COLUMN "storage_count";--> statement-breakpoint
ALTER TABLE "gallery" DROP COLUMN "storage_locations";--> statement-breakpoint
DROP TYPE "public"."storage_location_t";