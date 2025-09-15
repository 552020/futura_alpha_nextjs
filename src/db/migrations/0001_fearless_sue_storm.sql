CREATE TABLE "business_relationship" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_id" text NOT NULL,
	"client_id" text,
	"business_relationship_type" text NOT NULL,
	"client_name" text,
	"client_email" text,
	"client_phone" text,
	"client_type" text NOT NULL,
	"service_type" text NOT NULL,
	"contract_status" text DEFAULT 'pending' NOT NULL,
	"project_value" integer,
	"currency" text DEFAULT 'USD',
	"project_start_date" timestamp,
	"project_end_date" timestamp,
	"business_notes" text,
	"contract_url" text,
	"invoice_url" text,
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "professional_client" CASCADE;--> statement-breakpoint
ALTER TABLE "business_relationship" ADD CONSTRAINT "business_relationship_professional_id_all_user_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."all_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_relationship" ADD CONSTRAINT "business_relationship_client_id_all_user_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."all_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_relationship_professional_idx" ON "business_relationship" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "business_relationship_client_idx" ON "business_relationship" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "business_relationship_type_idx" ON "business_relationship" USING btree ("business_relationship_type");--> statement-breakpoint
CREATE INDEX "business_relationship_contract_status_idx" ON "business_relationship" USING btree ("contract_status");--> statement-breakpoint
CREATE INDEX "business_relationship_service_type_idx" ON "business_relationship" USING btree ("service_type");--> statement-breakpoint
CREATE INDEX "business_relationship_project_dates_idx" ON "business_relationship" USING btree ("project_start_date","project_end_date");