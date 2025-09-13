import { sql } from "drizzle-orm";
import { db } from "@/db/db";

export type MemoryWithGalleries = {
  id: string;
  type: "image" | "video" | "document" | "note" | "audio";
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
    WITH mem AS (
      SELECT 'image'::text AS type, i.id, i.owner_id, i.title, i.description, i.url, i.created_at, NULL::timestamp AS updated_at
      FROM "image" i
      WHERE i.owner_id = ${ownerAllUserId}

      UNION ALL

      SELECT 'video'::text AS type, v.id, v.owner_id, v.title, v.description, v.url, v.created_at, v.updated_at
      FROM "video" v
      WHERE v.owner_id = ${ownerAllUserId}

      UNION ALL

      SELECT 'document'::text AS type, d.id, d.owner_id, d.title, d.description, d.url, d.created_at, NULL::timestamp AS updated_at
      FROM "document" d
      WHERE d.owner_id = ${ownerAllUserId}

      UNION ALL

      SELECT 'audio'::text AS type, a.id, a.owner_id, a.title, a.description, a.url, a.created_at, a.updated_at
      FROM "audio" a
      WHERE a.owner_id = ${ownerAllUserId}

      UNION ALL

      -- Notes: we surface content as description for the unified shape
      SELECT 'note'::text AS type, n.id, n.owner_id, n.title, n.content AS description, ''::text AS url, n.created_at, n.updated_at
      FROM "note" n
      WHERE n.owner_id = ${ownerAllUserId}
    )

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
    FROM mem m
    LEFT JOIN "gallery_item" gi
      ON gi.memory_id = m.id AND gi.memory_type = m.type
    LEFT JOIN "gallery" g
      ON g.id = gi.gallery_id
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
    url: r.url ?? "",
    created_at: r.created_at?.toISOString ? r.created_at.toISOString() : String(r.created_at),
    updated_at: r.updated_at ? (r.updated_at.toISOString ? r.updated_at.toISOString() : String(r.updated_at)) : null,
    galleries: Array.isArray(r.galleries) ? r.galleries : JSON.parse(r.galleries ?? "[]"),
  })) as MemoryWithGalleries[];
}
