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
ALTER TABLE "document" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-24T11:57:54.802Z"}'::json;--> statement-breakpoint
ALTER TABLE "image" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-24T11:57:54.802Z"}'::json;--> statement-breakpoint
ALTER TABLE "gallery_share" ADD CONSTRAINT "gallery_share_gallery_id_gallery_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."gallery"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_share" ADD CONSTRAINT "gallery_share_owner_id_all_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_share" ADD CONSTRAINT "gallery_share_shared_with_id_all_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_share" ADD CONSTRAINT "gallery_share_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;