-- Create sync_status view for monitoring active syncs
CREATE OR REPLACE VIEW sync_status AS
SELECT
  memory_id,
  memory_type,
  artifact,
  backend,
  sync_state,
  sync_error,
  last_synced_at,
  created_at,
  updated_at,
  -- Calculate sync duration for active syncs
  CASE 
    WHEN sync_state = 'migrating' THEN 
      EXTRACT(EPOCH FROM (NOW() - created_at))::int
    ELSE NULL 
  END AS sync_duration_seconds,
  -- Flag for stuck syncs (migrating for more than 30 minutes)
  CASE 
    WHEN sync_state = 'migrating' AND created_at < NOW() - INTERVAL '30 minutes' 
    THEN true 
    ELSE false 
  END AS is_stuck
FROM storage_edges
WHERE sync_state IN ('migrating', 'failed')
ORDER BY 
  CASE sync_state 
    WHEN 'migrating' THEN 1 
    WHEN 'failed' THEN 2 
  END,
  created_at DESC;
