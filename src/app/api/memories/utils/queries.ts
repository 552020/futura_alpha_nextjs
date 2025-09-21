import { sql } from 'drizzle-orm';
import { db } from '@/db/db';

export type MemoryWithGalleries = {
  id: string;
  type: 'image' | 'video' | 'document' | 'note' | 'audio';
  owner_id: string;
  title: string | null;
  description: string | null;
  url: string;
  created_at: string; // ISO string from PG
  updated_at: string | null;
  // aggregated
  galleries: { id: string; title: string }[];
};

export async function fetchMemoriesWithGalleries(ownerAllUserId: string): Promise<MemoryWithGalleries[]> {
  const { rows } = await db.execute(sql`
    SELECT
      m.type,
      m.id,
      m.owner_id,
      m.title,
      m.description,
      m.url,
      m.created_at,
      m.updated_at,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT('id', g.id, 'title', g.title)
        ) FILTER (WHERE g.id IS NOT NULL),
        '[]'::json
      ) AS galleries
    FROM "memories" m
    LEFT JOIN "gallery_item" gi
      ON gi.memory_id = m.id AND gi.memory_type = m.type
    LEFT JOIN "gallery" g
      ON g.id = gi.gallery_id
    WHERE m.owner_id = ${ownerAllUserId}
    GROUP BY
      m.type, m.id, m.owner_id, m.title, m.description, m.url, m.created_at, m.updated_at
    ORDER BY m.created_at DESC
  `);

  // drizzle returns galleries as `any`; normalize to typed structure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.map((r: any) => ({
    id: r.id,
    type: r.type,
    owner_id: r.owner_id,
    title: r.title ?? null,
    description: r.description ?? null,
    url: r.url ?? '',
    created_at: r.created_at?.toISOString ? r.created_at.toISOString() : String(r.created_at),
    updated_at: r.updated_at ? (r.updated_at.toISOString ? r.updated_at.toISOString() : String(r.updated_at)) : null,
    galleries: Array.isArray(r.galleries) ? r.galleries : JSON.parse(r.galleries ?? '[]'),
  })) as MemoryWithGalleries[];
}
