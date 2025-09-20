import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Finds the lowest common ancestor (LCA) of two users.
 */
export async function findCommonAncestor(userAId: string, userBId: string) {
  try {
    const result = await db.execute(sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id, 0 AS depth FROM users WHERE id = ${userAId}
        UNION ALL
        SELECT u.id, u.parent_id, a.depth + 1
        FROM users u
        JOIN ancestors a ON u.id = a.parent_id
      ),
      ancestors_b AS (
        SELECT id, parent_id, 0 AS depth FROM users WHERE id = ${userBId}
        UNION ALL
        SELECT u.id, u.parent_id, a.depth + 1
        FROM users u
        JOIN ancestors_b a ON u.id = a.parent_id
      )
      SELECT a.id AS commonAncestor, a.depth + b.depth AS totalDepth
      FROM ancestors a
      JOIN ancestors_b b ON a.id = b.id
      ORDER BY totalDepth ASC
      LIMIT 1;
    `);

    // Safely access the first row with type safety
    const firstRow = Array.isArray(result.rows) && result.rows.length > 0 ? result.rows[0] : null;
    return firstRow as { commonAncestor: string; totalDepth: number } | null;
  } catch (error) {
    console.error('Error finding common ancestor:', error);
    throw new Error('Database error.');
  }
}

/**
 * Automatically resolves fuzzy family relationships.
 */
export async function resolveFuzzyRelationship(userAId: string, userBId: string) {
  const ancestorData = await findCommonAncestor(userAId, userBId);
  if (!ancestorData) {
    // console.log(`No common ancestor found for ${userAId} and ${userBId}`);
    return null;
  }

  const { commonAncestor, totalDepth } = ancestorData;
  const newFamilyRole = totalDepth === 1 ? 'sibling' : totalDepth === 2 ? 'uncle_aunt' : 'cousin';

  await db.execute(sql`
    UPDATE family_relationship
    SET relationshipClarity = 'resolved',
        familyRole = ${newFamilyRole},
        sharedAncestorId = ${commonAncestor}
    WHERE relationshipId = (
      SELECT id FROM family_relationship 
      WHERE userAId = ${userAId} AND userBId = ${userBId} AND relationshipClarity = 'fuzzy'
    )
  `);

  // console.log(`Updated relationship between ${userAId} and ${userBId} to ${newFamilyRole}`);
}
