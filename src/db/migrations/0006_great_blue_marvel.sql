CREATE TYPE "public"."storage_location_t" AS ENUM('neon-db', 'vercel-blob', 'icp-canister', 'aws-s3');--> statement-breakpoint
ALTER TABLE "memories" ALTER COLUMN "storage_locations" SET DEFAULT '{}'::"public"."storage_location_t"[];--> statement-breakpoint
ALTER TABLE "memories" ALTER COLUMN "storage_locations" SET DATA TYPE "public"."storage_location_t"[] USING "storage_locations"::"public"."storage_location_t"[];--> statement-breakpoint
ALTER TABLE "gallery" ALTER COLUMN "storage_locations" SET DEFAULT '{}'::"public"."storage_location_t"[];--> statement-breakpoint
ALTER TABLE "gallery" ALTER COLUMN "storage_locations" SET DATA TYPE "public"."storage_location_t"[] USING "storage_locations"::"public"."storage_location_t"[];