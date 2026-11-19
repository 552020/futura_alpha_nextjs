/**
 * Integration tests write to the database, so they only run when both the
 * app connection (DATABASE_URL) and TEST_DATABASE_URL point at a local
 * Postgres (docker-compose.dev.yml). Anything else skips the suite, which
 * keeps a cloud or production database out of reach by construction.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function isLocal(url: string | undefined): url is string {
  if (!url) return false;
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export const hasLocalDb =
  isLocal(process.env.TEST_DATABASE_URL) && isLocal(process.env.DATABASE_URL);
