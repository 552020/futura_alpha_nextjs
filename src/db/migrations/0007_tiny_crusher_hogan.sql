CREATE TYPE "public"."grant_source_t" AS ENUM('user', 'group', 'magic_link', 'public_mode', 'system');--> statement-breakpoint
CREATE TYPE "public"."membership_role_t" AS ENUM('owner', 'superadmin', 'admin', 'member', 'guest');--> statement-breakpoint
CREATE TYPE "public"."resource_type_t" AS ENUM('gallery', 'memory', 'folder');--> statement-breakpoint
CREATE TABLE "gallery_share" (
	"id" text PRIMARY KEY NOT NULL,
	"gallery_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"shared_with_type" text NOT NULL,
	"shared_with_id" text,
	"group_id" text,
	"shared_relationship_type" text,
	"access_level" text DEFAULT 'read' NOT NULL,
	"invitee_secure_code" text NOT NULL,
	"secure_code_created_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "magic_link" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "magic_link_consumption" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "resource_public_policy" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "resource_registry" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "role_template" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "magic_link" CASCADE;--> statement-breakpoint
DROP TABLE "magic_link_consumption" CASCADE;--> statement-breakpoint
DROP TABLE "resource_public_policy" CASCADE;--> statement-breakpoint
DROP TABLE "resource_registry" CASCADE;--> statement-breakpoint
DROP TABLE "role_template" CASCADE;--> statement-breakpoint
ALTER TABLE "resource_membership" ALTER COLUMN "resource_type" SET DATA TYPE "public"."resource_type_t" USING "resource_type"::"public"."resource_type_t";--> statement-breakpoint
ALTER TABLE "resource_membership" ALTER COLUMN "grant_source" SET DATA TYPE "public"."grant_source_t" USING "grant_source"::"public"."grant_source_t";--> statement-breakpoint
ALTER TABLE "resource_membership" ALTER COLUMN "role" SET DATA TYPE "public"."membership_role_t" USING "role"::"public"."membership_role_t";--> statement-breakpoint
ALTER TABLE "gallery_share" ADD CONSTRAINT "gallery_share_gallery_id_gallery_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."gallery"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_share" ADD CONSTRAINT "gallery_share_owner_id_all_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_share" ADD CONSTRAINT "gallery_share_shared_with_id_all_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_share" ADD CONSTRAINT "gallery_share_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_membership" ADD CONSTRAINT "resource_membership_all_user_id_all_user_id_fk" FOREIGN KEY ("all_user_id") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_membership" ADD CONSTRAINT "resource_membership_invited_by_all_user_id_all_user_id_fk" FOREIGN KEY ("invited_by_all_user_id") REFERENCES "public"."all_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_hosting_preferences" DROP COLUMN "advanced_database_switching";--> statement-breakpoint
ALTER TABLE "user_hosting_preferences" DROP COLUMN "current_database_view";