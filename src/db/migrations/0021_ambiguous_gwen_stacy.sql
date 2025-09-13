ALTER TABLE "document" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-31T13:59:02.061Z"}'::json;--> statement-breakpoint
ALTER TABLE "image" ALTER COLUMN "metadata" SET DEFAULT '{"size":0,"mimeType":"","originalName":"","uploadedAt":"2025-08-31T13:59:02.058Z"}'::json;--> statement-breakpoint
-- Create memory_presence view (plain view for real-time data)
CREATE OR REPLACE VIEW memory_presence AS
SELECT
  e.memory_id,
  e.memory_type,
  BOOL_OR(e.backend = 'neon-db'     AND e.artifact = 'metadata' AND e.present) AS meta_neon,
  BOOL_OR(e.backend = 'vercel-blob' AND e.artifact = 'asset'    AND e.present) AS asset_blob,
  BOOL_OR(e.backend = 'icp-canister'AND e.artifact = 'metadata' AND e.present) AS meta_icp,
  BOOL_OR(e.backend = 'icp-canister'AND e.artifact = 'asset'    AND e.present) AS asset_icp
FROM storage_edges e
GROUP BY e.memory_id, e.memory_type;--> statement-breakpoint
-- Create gallery_presence materialized view (performance for gallery pages)
DROP MATERIALIZED VIEW IF EXISTS gallery_presence;
CREATE MATERIALIZED VIEW gallery_presence AS
WITH m AS (
  SELECT gi.gallery_id, mp.*
  FROM gallery_items gi
  JOIN memory_presence mp
    ON mp.memory_id   = gi.memory_id
   AND mp.memory_type = gi.memory_type
)
SELECT
  gallery_id,
  COUNT(*)                                 AS total_memories,
  SUM((meta_icp AND asset_icp)::int)       AS icp_complete_memories,
  BOOL_AND(meta_icp AND asset_icp)         AS icp_complete,
  BOOL_OR (meta_icp OR  asset_icp)         AS icp_any
FROM m
GROUP BY gallery_id
WITH NO DATA;--> statement-breakpoint
-- Create indexes for fast lookups on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS ix_gallery_presence_id ON gallery_presence(gallery_id);--> statement-breakpoint
-- Create refresh function for the materialized view
CREATE OR REPLACE FUNCTION refresh_gallery_presence() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY gallery_presence;
END;
$$ LANGUAGE plpgsql;