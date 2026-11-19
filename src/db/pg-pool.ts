/**
 * Postgres connection over the standard wire protocol (node-postgres Pool).
 *
 * Replaces @neondatabase/serverless + drizzle-orm/neon-http, which only
 * worked against Neon's HTTP proxy. A pg Pool works against Neon (pooled or
 * direct endpoint), a local Docker Postgres, and self-hosted Postgres (e.g.
 * Hetzner behind PgBouncer in transaction mode). Same pattern as Foto Kotti.
 */
import tls from 'node:tls';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from './index';

/**
 * TLS handling:
 * - DATABASE_CA_CERT set (self-hosted Postgres/PgBouncer with a private CA):
 *   verify the chain against that CA. Two pg v8 quirks are worked around:
 *   any `sslmode` in the URL makes pg-connection-string replace our ssl
 *   object (so it is stripped), and pg checks the certificate against the
 *   literal "localhost", so the identity check runs against the real host.
 * - Otherwise, `sslmode=require|verify-*` in the URL (Neon) encrypts without
 *   CA pinning; no sslmode (local Docker) connects in plain text.
 */
export function buildConnection(
  connectionString: string
): Pick<PoolConfig, 'connectionString' | 'ssl'> {
  const ca = process.env.DATABASE_CA_CERT;
  if (ca) {
    const url = new URL(connectionString);
    const host = url.hostname;
    url.searchParams.delete('sslmode');
    return {
      connectionString: url.toString(),
      ssl: {
        ca,
        rejectUnauthorized: true,
        checkServerIdentity: (_host, cert) =>
          tls.checkServerIdentity(host, cert),
      },
    };
  }
  if (!/sslmode=(require|verify-ca|verify-full)/.test(connectionString)) {
    return { connectionString };
  }
  return { connectionString, ssl: { rejectUnauthorized: false } };
}

/**
 * Small pool sized for serverless: each Vercel function instance gets its own
 * pool and PgBouncer multiplexes the real server connections.
 * allowExitOnIdle lets scripts and tests exit without an explicit pool.end().
 */
export function createPool(connectionString: string, max = 3): Pool {
  return new Pool({
    ...buildConnection(connectionString),
    max,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });
}

export function createDb(connectionString: string, max = 3) {
  return drizzle(createPool(connectionString, max), { schema });
}

export type Database = ReturnType<typeof createDb>;
