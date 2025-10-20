CREATE TABLE "resource_share_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_type" "resource_type_t" NOT NULL,
	"resource_id" text NOT NULL,
	"token" text NOT NULL,
	"created_by" text NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "resource_share_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "resource_share_tokens" ADD CONSTRAINT "resource_share_tokens_created_by_all_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resource_share_tokens_token_idx" ON "resource_share_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "resource_share_tokens_resource_idx" ON "resource_share_tokens" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "resource_share_tokens_created_by_idx" ON "resource_share_tokens" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "resource_share_tokens_active_expires_idx" ON "resource_share_tokens" USING btree ("is_active","expires_at");

