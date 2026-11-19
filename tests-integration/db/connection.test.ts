// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import { buildConnection } from '@/db/pg-pool';
import { hasLocalDb } from '../local-db';

describe('buildConnection (TLS handling)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('connects in plain text when the URL has no sslmode (local Docker)', () => {
    vi.stubEnv('DATABASE_CA_CERT', '');
    const conn = buildConnection('postgres://u:p@localhost:5452/futura');
    expect(conn.ssl).toBeUndefined();
  });

  it('encrypts without CA pinning for sslmode=require (Neon)', () => {
    vi.stubEnv('DATABASE_CA_CERT', '');
    const url =
      'postgres://u:p@ep-x.eu-central-1.aws.neon.tech/db?sslmode=require';
    expect(buildConnection(url)).toEqual({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    });
  });

  it('pins the CA and strips sslmode when DATABASE_CA_CERT is set (Hetzner)', () => {
    vi.stubEnv(
      'DATABASE_CA_CERT',
      '-----BEGIN CERTIFICATE-----\nX\n-----END CERTIFICATE-----'
    );
    const conn = buildConnection(
      'postgres://u:p@10.0.0.5:6432/futura?sslmode=require'
    );
    expect(conn.connectionString).not.toContain('sslmode');
    expect(conn.ssl).toMatchObject({ rejectUnauthorized: true });
    expect(
      typeof (conn.ssl as { checkServerIdentity?: unknown }).checkServerIdentity
    ).toBe('function');
  });
});

describe.skipIf(!hasLocalDb)('pg connector against local Postgres', () => {
  it('runs raw SQL and returns { rows } like the app code expects', async () => {
    const { db } = await import('@/db/db');
    const { rows } = await db.execute(
      sql`select 1::int as one, version() as v`
    );
    expect(rows[0]).toMatchObject({ one: 1 });
    expect(String(rows[0].v)).toMatch(/PostgreSQL 1[6-9]/);
  });

  it('runs typed Drizzle queries against the pushed schema', async () => {
    const { db, allUsers } = await import('@/db/db');
    const rows = await db.select().from(allUsers).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });
});
