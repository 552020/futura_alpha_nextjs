CREATE TABLE "memory_public_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memory_id" uuid NOT NULL,
	"token" text NOT NULL,
	"created_by" text NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memory_public_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "memory_public_links" ADD CONSTRAINT "memory_public_links_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_public_links" ADD CONSTRAINT "memory_public_links_created_by_all_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memory_public_links_token_idx" ON "memory_public_links" USING btree ("token");--> statement-breakpoint
CREATE INDEX "memory_public_links_memory_idx" ON "memory_public_links" USING btree ("memory_id");--> statement-breakpoint
CREATE INDEX "memory_public_links_created_by_idx" ON "memory_public_links" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "memory_public_links_active_expires_idx" ON "memory_public_links" USING btree ("is_active","expires_at");