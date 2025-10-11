CREATE TABLE "magic_link" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"type" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"inviter_all_user_id" text NOT NULL,
	"intended_email" text,
	"admin_subtype" text,
	"preset_perm_mask" integer DEFAULT 1 NOT NULL,
	"max_uses" integer DEFAULT 1000 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "magic_link_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "magic_link_consumption" (
	"id" text PRIMARY KEY NOT NULL,
	"magic_link_id" text NOT NULL,
	"all_user_id" text,
	"ip" text,
	"user_agent" text,
	"used_at" timestamp DEFAULT now() NOT NULL,
	"result" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_membership" (
	"id" text PRIMARY KEY NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"all_user_id" text NOT NULL,
	"grant_source" text NOT NULL,
	"source_id" text,
	"role" text NOT NULL,
	"perm_mask" integer DEFAULT 0 NOT NULL,
	"invited_by_all_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_public_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"mode" text DEFAULT 'private' NOT NULL,
	"link_token_hash" text,
	"perm_mask" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"resource_type" text NOT NULL,
	"owner_all_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_template" (
	"role" text PRIMARY KEY NOT NULL,
	"resource_type" text NOT NULL,
	"perm_mask" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "gallery_share" CASCADE;--> statement-breakpoint
DROP TABLE "memory_share" CASCADE;--> statement-breakpoint
CREATE INDEX "ml_resource_type_idx" ON "magic_link" USING btree ("resource_type","resource_id","type");--> statement-breakpoint
CREATE INDEX "ml_expires_idx" ON "magic_link" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "mlc_link_idx" ON "magic_link_consumption" USING btree ("magic_link_id","used_at");--> statement-breakpoint
CREATE INDEX "mlc_user_idx" ON "magic_link_consumption" USING btree ("all_user_id","used_at");--> statement-breakpoint
CREATE INDEX "rm_resource_idx" ON "resource_membership" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "rm_user_idx" ON "resource_membership" USING btree ("all_user_id");--> statement-breakpoint
CREATE INDEX "rm_role_idx" ON "resource_membership" USING btree ("role");--> statement-breakpoint
CREATE INDEX "rm_source_idx" ON "resource_membership" USING btree ("grant_source","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rm_unique_grant" ON "resource_membership" USING btree ("resource_type","resource_id","all_user_id","grant_source","source_id");--> statement-breakpoint
CREATE INDEX "rpp_resource_idx" ON "resource_public_policy" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "rpp_mode_idx" ON "resource_public_policy" USING btree ("mode");--> statement-breakpoint
CREATE INDEX "resource_registry_rt_idx" ON "resource_registry" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "role_template_rt_idx" ON "role_template" USING btree ("resource_type");