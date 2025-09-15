ALTER TABLE "business_relationship" RENAME COLUMN "professional_id" TO "business_id";--> statement-breakpoint
ALTER TABLE "business_relationship" DROP CONSTRAINT "business_relationship_professional_id_all_user_id_fk";
--> statement-breakpoint
DROP INDEX "business_relationship_professional_idx";--> statement-breakpoint
DROP INDEX "business_relationship_type_idx";--> statement-breakpoint
DROP INDEX "business_relationship_contract_status_idx";--> statement-breakpoint
DROP INDEX "business_relationship_service_type_idx";--> statement-breakpoint
DROP INDEX "business_relationship_project_dates_idx";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "user_type" text DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_relationship" ADD CONSTRAINT "business_relationship_business_id_all_user_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."all_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_relationship_business_idx" ON "business_relationship" USING btree ("business_id");--> statement-breakpoint
ALTER TABLE "business_relationship" DROP COLUMN "business_relationship_type";--> statement-breakpoint
ALTER TABLE "business_relationship" DROP COLUMN "client_phone";--> statement-breakpoint
ALTER TABLE "business_relationship" DROP COLUMN "client_type";--> statement-breakpoint
ALTER TABLE "business_relationship" DROP COLUMN "service_type";--> statement-breakpoint
ALTER TABLE "business_relationship" DROP COLUMN "contract_status";--> statement-breakpoint
ALTER TABLE "business_relationship" DROP COLUMN "project_value";--> statement-breakpoint
ALTER TABLE "business_relationship" DROP COLUMN "currency";--> statement-breakpoint
ALTER TABLE "business_relationship" DROP COLUMN "project_start_date";--> statement-breakpoint
ALTER TABLE "business_relationship" DROP COLUMN "project_end_date";--> statement-breakpoint
ALTER TABLE "business_relationship" DROP COLUMN "business_notes";--> statement-breakpoint
ALTER TABLE "business_relationship" DROP COLUMN "contract_url";--> statement-breakpoint
ALTER TABLE "business_relationship" DROP COLUMN "invoice_url";--> statement-breakpoint
ALTER TABLE "business_relationship" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "business_relationship" DROP COLUMN "updated_at";