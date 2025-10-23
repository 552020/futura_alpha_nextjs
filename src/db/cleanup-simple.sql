-- Cleanup script for temporary users
-- Run this in your database to clean up all temporary users

-- 1. Delete assets for temporary user memories
DELETE FROM assets 
WHERE memoryId IN (
  SELECT id FROM memories 
  WHERE ownerId IN (
    SELECT id FROM allUsers WHERE type = 'temporary'
  )
);

-- 2. Delete memories for temporary users
DELETE FROM memories 
WHERE ownerId IN (
  SELECT id FROM allUsers WHERE type = 'temporary'
);

-- 3. Delete temporary users
DELETE FROM temporaryUsers 
WHERE id IN (
  SELECT temporaryUserId FROM allUsers WHERE type = 'temporary' AND temporaryUserId IS NOT NULL
);

-- 4. Delete allUsers records for temporary users
DELETE FROM allUsers WHERE type = 'temporary';

-- Show results
SELECT 'Cleanup completed' as status;
