ALTER TABLE "document" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-31T13:47:52.763Z"}'::json;--> statement-breakpoint
ALTER TABLE "image" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-31T13:47:52.762Z"}'::json;--> statement-breakpoint
CREATE INDEX "ix_edges_memory" ON "storage_edges" USING btree ("memory_id","memory_type");--> statement-breakpoint
CREATE INDEX "ix_edges_backend_present" ON "storage_edges" USING btree ("backend","artifact","present");--> statement-breakpoint
CREATE INDEX "ix_edges_sync_state" ON "storage_edges" USING btree ("sync_state");