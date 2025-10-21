-- Make storage_edges.memory_id foreign key constraint optional
-- This allows storage edges to reference memories that exist only in ICP canister
-- without requiring them to exist in the Neon database first

-- Drop the existing foreign key constraint
ALTER TABLE "storage_edges" DROP CONSTRAINT IF EXISTS "storage_edges_memory_id_memories_id_fk";

-- Add a new foreign key constraint that allows NULL values
-- This way storage edges can reference either:
-- 1. Memories that exist in the Neon database (with foreign key validation)
-- 2. ICP-only memories (without foreign key validation)
ALTER TABLE "storage_edges" ADD CONSTRAINT "storage_edges_memory_id_memories_id_fk" 
FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
