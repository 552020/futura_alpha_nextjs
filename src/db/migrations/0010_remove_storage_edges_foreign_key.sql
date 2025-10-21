-- Remove foreign key constraint from storage_edges.memory_id
-- This allows storage edges to reference memories that exist only in ICP canister
-- without requiring them to exist in the Neon database first

-- Drop the existing foreign key constraint
ALTER TABLE "storage_edges" DROP CONSTRAINT IF EXISTS "storage_edges_memory_id_memories_id_fk";
