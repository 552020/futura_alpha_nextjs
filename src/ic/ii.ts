'use client';

import { AuthClient } from '@dfinity/auth-client';
import type { Identity } from '@dfinity/agent';
import { clearAgentCache } from './agent';

let cachedAuthClientPromise: Promise<AuthClient> | null = null;

export function getAuthClient(): Promise<AuthClient> {
  if (!cachedAuthClientPromise) {
    cachedAuthClientPromise = AuthClient.create();
  }
  return cachedAuthClientPromise;
}

export function getSessionTtlNs(): bigint | undefined {
  const hoursStr = process.env.NEXT_PUBLIC_II_SESSION_TTL_HOURS;
  const hours = hoursStr ? parseInt(hoursStr) : undefined;
  if (!hours || Number.isNaN(hours)) return undefined;
  return BigInt(hours * 60 * 60 * 1000 * 1000 * 1000);
}

export async function loginWithII(): Promise<{ identity: Identity; principal: string }> {
  // icpLogger.info("loginWithII");
  const provider = process.env.NEXT_PUBLIC_II_URL || process.env.NEXT_PUBLIC_II_URL_FALLBACK;
  if (!provider) throw new Error('II URL not configured');
  // icpLogger.info("loginWithII", "provider", provider);
  const authClient = await getAuthClient();
  const maxTimeToLive = getSessionTtlNs();
  // icpLogger.info("authClient", authClient);

  await new Promise<void>((resolve, reject) =>
    authClient.login({
      identityProvider: provider,
      ...(maxTimeToLive ? { maxTimeToLive } : {}),
      onSuccess: resolve,
      onError: reject,
    })
  );
  // icpLogger.info("loginWithII");
  const identity = authClient.getIdentity();
  // icpLogger.info("identity", identity);
  const principal = identity.getPrincipal().toString();
  // icpLogger.info("principal", principal);
  return { identity, principal };
}

export async function clearIiSession(): Promise<void> {
  try {
    const authClient = await getAuthClient();
    await authClient.logout();
  } finally {
    clearAgentCache();
  }
}

export function resetCachedAuthClient() {
  cachedAuthClientPromise = null;
}
