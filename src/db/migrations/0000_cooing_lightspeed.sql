CREATE TYPE "public"."artifact_t" AS ENUM('metadata', 'asset');--> statement-breakpoint
CREATE TYPE "public"."asset_type_t" AS ENUM('original', 'display', 'thumb', 'placeholder', 'poster', 'waveform');--> statement-breakpoint
CREATE TYPE "public"."backend_t" AS ENUM('neon-db', 'vercel-blob', 'icp-canister');--> statement-breakpoint
CREATE TYPE "public"."memory_type_t" AS ENUM('image', 'video', 'note', 'document', 'audio');--> statement-breakpoint
CREATE TYPE "public"."processing_status_t" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."storage_backend_t" AS ENUM('s3', 'vercel_blob', 'icp', 'arweave', 'ipfs', 'neon');--> statement-breakpoint
CREATE TYPE "public"."storage_pref_t" AS ENUM('neon', 'icp', 'dual');--> statement-breakpoint
CREATE TYPE "public"."sync_t" AS ENUM('idle', 'migrating', 'failed');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "all_user" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"user_id" text,
	"temporary_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audio_details" (
	"memory_id" uuid PRIMARY KEY NOT NULL,
	"duration_ms" integer,
	"bitrate" integer,
	"sample_rate" integer,
	"channels" integer
);
--> statement-breakpoint
CREATE TABLE "authenticator" (
	"credentialID" text NOT NULL,
	"userId" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"credentialPublicKey" text NOT NULL,
	"counter" integer NOT NULL,
	"credentialDeviceType" text NOT NULL,
	"credentialBackedUp" boolean NOT NULL,
	"transports" text,
	CONSTRAINT "authenticator_credentialID_unique" UNIQUE("credentialID")
);
--> statement-breakpoint
CREATE TABLE "document_details" (
	"memory_id" uuid PRIMARY KEY NOT NULL,
	"pages" integer,
	"mime_type" text
);
--> statement-breakpoint
CREATE TABLE "family_member" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"user_id" text,
	"full_name" text NOT NULL,
	"primary_relationship" text NOT NULL,
	"fuzzy_relationships" text[] DEFAULT '{}' NOT NULL,
	"birth_date" timestamp,
	"death_date" timestamp,
	"birthplace" text,
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_relationship" (
	"id" text PRIMARY KEY NOT NULL,
	"relationship_id" text NOT NULL,
	"family_role" text NOT NULL,
	"relationship_clarity" text DEFAULT 'fuzzy' NOT NULL,
	"shared_ancestor_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"parent_folder_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_item" (
	"id" text PRIMARY KEY NOT NULL,
	"gallery_id" text NOT NULL,
	"memory_id" uuid NOT NULL,
	"memory_type" text NOT NULL,
	"position" integer NOT NULL,
	"caption" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "group" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" json DEFAULT '{}'::json
);
--> statement-breakpoint
CREATE TABLE "group_member" (
	"group_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	CONSTRAINT "group_member_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "ii_nonce" (
	"id" text PRIMARY KEY NOT NULL,
	"nonce_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"context" json DEFAULT '{}'::json
);
--> statement-breakpoint
CREATE TABLE "image_details" (
	"memory_id" uuid PRIMARY KEY NOT NULL,
	"width" integer,
	"height" integer,
	"exif" json
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"type" "memory_type_t" NOT NULL,
	"title" text,
	"description" text,
	"taken_at" timestamp,
	"is_public" boolean DEFAULT false NOT NULL,
	"owner_secure_code" text NOT NULL,
	"parent_folder_id" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memory_id" uuid NOT NULL,
	"asset_type" "asset_type_t" NOT NULL,
	"variant" text,
	"url" text NOT NULL,
	"storage_backend" "storage_backend_t" NOT NULL,
	"bucket" text,
	"storage_key" text NOT NULL,
	"bytes" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"mime_type" text NOT NULL,
	"sha256" text,
	"processing_status" "processing_status_t" DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memory_assets_bytes_positive" CHECK ("memory_assets"."bytes" > 0),
	CONSTRAINT "memory_assets_dimensions_positive" CHECK (("memory_assets"."width" IS NULL OR "memory_assets"."width" > 0) AND ("memory_assets"."height" IS NULL OR "memory_assets"."height" > 0))
);
--> statement-breakpoint
CREATE TABLE "memory_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memory_id" uuid NOT NULL,
	"memory_type" "memory_type_t" NOT NULL,
	"exif_data" json,
	"processing_status" "processing_status_t" DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_share" (
	"id" text PRIMARY KEY NOT NULL,
	"memory_id" uuid NOT NULL,
	"memory_type" text NOT NULL,
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
CREATE TABLE "note_details" (
	"memory_id" uuid PRIMARY KEY NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_client" (
	"id" text PRIMARY KEY NOT NULL,
	"relationship_id" text NOT NULL,
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
CREATE TABLE "relationship" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"related_user_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"memory_id" uuid NOT NULL,
	"memory_type" "memory_type_t" NOT NULL,
	"artifact" "artifact_t" NOT NULL,
	"backend" "backend_t" NOT NULL,
	"present" boolean DEFAULT false NOT NULL,
	"location" text,
	"content_hash" text,
	"size_bytes" bigint,
	"sync_state" "sync_t" DEFAULT 'idle' NOT NULL,
	"last_synced_at" timestamp,
	"sync_error" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "temporary_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"secure_code" text NOT NULL,
	"secure_code_expires_at" timestamp NOT NULL,
	"role" text NOT NULL,
	"invited_by_all_user_id" text,
	"registration_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" json DEFAULT '{}'::json
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"password" text,
	"username" text,
	"parent_id" text,
	"invited_by_all_user_id" text,
	"invited_at" timestamp,
	"registration_status" text DEFAULT 'pending' NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"premium_expires_at" timestamp,
	"storage_preference" "storage_pref_t" DEFAULT 'neon' NOT NULL,
	"storage_primary_storage" "backend_t" DEFAULT 'neon-db' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" json DEFAULT '{}'::json,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "video_details" (
	"memory_id" uuid PRIMARY KEY NOT NULL,
	"duration_ms" integer NOT NULL,
	"width" integer,
	"height" integer,
	"codec" text,
	"fps" text
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_details" ADD CONSTRAINT "audio_details_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authenticator" ADD CONSTRAINT "authenticator_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_details" ADD CONSTRAINT "document_details_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_member" ADD CONSTRAINT "family_member_owner_id_all_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_member" ADD CONSTRAINT "family_member_user_id_all_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."all_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_member" ADD CONSTRAINT "family_member_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."all_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_relationship" ADD CONSTRAINT "family_relationship_relationship_id_relationship_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."relationship"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_relationship" ADD CONSTRAINT "family_relationship_shared_ancestor_id_all_user_id_fk" FOREIGN KEY ("shared_ancestor_id") REFERENCES "public"."all_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_owner_id_all_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery" ADD CONSTRAINT "gallery_owner_id_all_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_item" ADD CONSTRAINT "gallery_item_gallery_id_gallery_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."gallery"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_share" ADD CONSTRAINT "gallery_share_gallery_id_gallery_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."gallery"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_share" ADD CONSTRAINT "gallery_share_owner_id_all_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_share" ADD CONSTRAINT "gallery_share_shared_with_id_all_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_share" ADD CONSTRAINT "gallery_share_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group" ADD CONSTRAINT "group_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_details" ADD CONSTRAINT "image_details_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_owner_id_all_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_assets" ADD CONSTRAINT "memory_assets_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_share" ADD CONSTRAINT "memory_share_owner_id_all_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_share" ADD CONSTRAINT "memory_share_shared_with_id_all_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_share" ADD CONSTRAINT "memory_share_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_details" ADD CONSTRAINT "note_details_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_client" ADD CONSTRAINT "professional_client_relationship_id_relationship_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."relationship"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_user_id_all_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_related_user_id_all_user_id_fk" FOREIGN KEY ("related_user_id") REFERENCES "public"."all_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temporary_user" ADD CONSTRAINT "temporary_user_invited_by_fk" FOREIGN KEY ("invited_by_all_user_id") REFERENCES "public"."all_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_invited_by_fk" FOREIGN KEY ("invited_by_all_user_id") REFERENCES "public"."all_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_details" ADD CONSTRAINT "video_details_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_provider_idx" ON "account" USING btree ("userId","provider");--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "all_users_one_ref_guard" ON "all_user" USING btree ("id") WHERE (CASE WHEN "all_user"."user_id" IS NOT NULL THEN 1 ELSE 0 END +
                   CASE WHEN "all_user"."temporary_user_id" IS NOT NULL THEN 1 ELSE 0 END) = 1;--> statement-breakpoint
CREATE INDEX "folders_owner_idx" ON "folders" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "folders_parent_idx" ON "folders" USING btree ("parent_folder_id");--> statement-breakpoint
CREATE INDEX "gallery_items_gallery_position_idx" ON "gallery_item" USING btree ("gallery_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "gallery_items_gallery_memory_uq" ON "gallery_item" USING btree ("gallery_id","memory_id","memory_type");--> statement-breakpoint
CREATE INDEX "gallery_items_by_memory_idx" ON "gallery_item" USING btree ("memory_id","memory_type");--> statement-breakpoint
CREATE INDEX "ii_nonces_hash_idx" ON "ii_nonce" USING btree ("nonce_hash");--> statement-breakpoint
CREATE INDEX "ii_nonces_expires_idx" ON "ii_nonce" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "ii_nonces_used_idx" ON "ii_nonce" USING btree ("used_at");--> statement-breakpoint
CREATE INDEX "ii_nonces_active_idx" ON "ii_nonce" USING btree ("used_at","expires_at");--> statement-breakpoint
CREATE INDEX "ii_nonces_created_idx" ON "ii_nonce" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "memories_owner_created_idx" ON "memories" USING btree ("owner_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "memories_type_idx" ON "memories" USING btree ("type");--> statement-breakpoint
CREATE INDEX "memories_public_idx" ON "memories" USING btree ("is_public");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_assets_unique" ON "memory_assets" USING btree ("memory_id","asset_type");--> statement-breakpoint
CREATE INDEX "memory_assets_memory_idx" ON "memory_assets" USING btree ("memory_id");--> statement-breakpoint
CREATE INDEX "memory_assets_type_idx" ON "memory_assets" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX "memory_assets_url_idx" ON "memory_assets" USING btree ("url");--> statement-breakpoint
CREATE INDEX "memory_assets_storage_idx" ON "memory_assets" USING btree ("storage_backend","storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_metadata_unique" ON "memory_metadata" USING btree ("memory_id","memory_type");--> statement-breakpoint
CREATE INDEX "memory_metadata_memory_idx" ON "memory_metadata" USING btree ("memory_id","memory_type");--> statement-breakpoint
CREATE INDEX "memory_metadata_status_idx" ON "memory_metadata" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "professional_client_contract_status_idx" ON "professional_client" USING btree ("contract_status");--> statement-breakpoint
CREATE INDEX "professional_client_service_type_idx" ON "professional_client" USING btree ("service_type");--> statement-breakpoint
CREATE INDEX "professional_client_project_dates_idx" ON "professional_client" USING btree ("project_start_date","project_end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_relation_idx" ON "relationship" USING btree ("user_id","related_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_edge" ON "storage_edges" USING btree ("memory_id","memory_type","artifact","backend");--> statement-breakpoint
CREATE INDEX "ix_edges_memory" ON "storage_edges" USING btree ("memory_id","memory_type");--> statement-breakpoint
CREATE INDEX "ix_edges_backend_present" ON "storage_edges" USING btree ("backend","artifact","present");--> statement-breakpoint
CREATE INDEX "ix_edges_sync_state" ON "storage_edges" USING btree ("sync_state");