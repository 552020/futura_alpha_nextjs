// @vitest-environment node
/**
 * Auth guard and test endpoints, exercised without a running server.
 *
 * Replaces the old supertest/JWT suites, which needed a hand-started dev
 * server and contradicted each other (some needed TEST_AUTH_BYPASS on,
 * others off). Route handlers are called directly; NextAuth's auth() is
 * mocked so each case controls the session explicitly.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const authMock = vi.hoisted(() => vi.fn());
vi.mock('../../auth', () => ({ auth: authMock }));

import { requireAuth } from '@/lib/auth-utils';
import * as authRoute from '@/app/api/test/auth/route';
import * as helloRoute from '@/app/api/test/hello/route';

const url = 'http://localhost:3000/api/test/auth';
type RequestInitLike = NonNullable<
  ConstructorParameters<typeof NextRequest>[1]
>;
const req = (
  headers: Record<string, string> = {},
  init: RequestInitLike = {}
) => new NextRequest(url, { headers, ...init });

const realSession = {
  user: { id: 'user-1', email: 'real@example.com', role: 'user' },
  expires: new Date(Date.now() + 3_600_000).toISOString(),
};

beforeEach(() => {
  authMock.mockReset();
  vi.stubEnv('TEST_AUTH_BYPASS', '');
  vi.stubEnv('VERCEL_ENV', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('requireAuth', () => {
  it('returns null when NextAuth has no session', async () => {
    authMock.mockResolvedValue(null);
    expect(await requireAuth(req())).toBeNull();
    expect(authMock).toHaveBeenCalledOnce();
  });

  it('returns the NextAuth session when there is one', async () => {
    authMock.mockResolvedValue(realSession);
    expect(await requireAuth(req())).toEqual(realSession);
  });

  it('ignores x-test-* headers when the bypass is off', async () => {
    authMock.mockResolvedValue(null);
    const session = await requireAuth(req({ 'x-test-user-id': 'attacker' }));
    expect(session).toBeNull();
  });

  it('builds the session from x-test-* headers when the bypass is on locally', async () => {
    vi.stubEnv('TEST_AUTH_BYPASS', '1');
    const session = await requireAuth(
      req({
        'x-test-user-id': 'u-42',
        'x-test-user-email': 'tester@example.com',
        'x-test-user-role': 'admin',
        'x-test-linked-principal': 'aaaaa-aa',
      })
    );
    expect(authMock).not.toHaveBeenCalled();
    expect(session?.user).toMatchObject({
      id: 'u-42',
      email: 'tester@example.com',
      role: 'admin',
      linkedIcPrincipal: 'aaaaa-aa',
    });
  });

  it.each(['production', 'preview', 'development'])(
    'never bypasses on Vercel (VERCEL_ENV=%s)',
    async (vercelEnv) => {
      vi.stubEnv('TEST_AUTH_BYPASS', '1');
      vi.stubEnv('VERCEL_ENV', vercelEnv);
      authMock.mockResolvedValue(null);
      const session = await requireAuth(req({ 'x-test-user-id': 'attacker' }));
      expect(session).toBeNull();
      expect(authMock).toHaveBeenCalledOnce();
    }
  );
});

describe('/api/test/auth', () => {
  it('GET returns 401 without a session', async () => {
    authMock.mockResolvedValue(null);
    const res = await authRoute.GET(req());
    expect(res.status).toBe(401);
  });

  it('GET returns the session user when authenticated', async () => {
    authMock.mockResolvedValue(realSession);
    const res = await authRoute.GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toMatchObject({
      id: 'user-1',
      email: 'real@example.com',
    });
  });

  it('POST echoes the body for an authenticated user', async () => {
    authMock.mockResolvedValue(realSession);
    const res = await authRoute.POST(
      req(
        { 'content-type': 'application/json' },
        { method: 'POST', body: JSON.stringify({ hello: 'world' }) }
      )
    );
    expect(res.status).toBe(200);
    expect((await res.json()).receivedData).toEqual({ hello: 'world' });
  });

  it('POST returns 401 without a session', async () => {
    authMock.mockResolvedValue(null);
    const res = await authRoute.POST(
      req({}, { method: 'POST', body: JSON.stringify({}) })
    );
    expect(res.status).toBe(401);
  });
});

describe('/api/test/hello', () => {
  it('GET is public', async () => {
    const res = await helloRoute.GET();
    expect(res.status).toBe(200);
    expect((await res.json()).endpoint).toBe('/api/test/hello');
  });
});
