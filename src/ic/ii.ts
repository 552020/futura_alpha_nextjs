"use client";

import { AuthClient } from "@dfinity/auth-client";
import type { Identity } from "@dfinity/agent";
import { clearAgentCache } from "./agent";

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
  // console.log("loginWithII");
  const provider = process.env.NEXT_PUBLIC_II_URL || process.env.NEXT_PUBLIC_II_URL_FALLBACK;
  if (!provider) throw new Error("II URL not configured");
  // console.log("loginWithII", "provider", provider);
  const authClient = await getAuthClient();
  const maxTimeToLive = getSessionTtlNs();
  // console.log("authClient", authClient);

  await new Promise<void>((resolve, reject) =>
    authClient.login({
      identityProvider: provider,
      ...(maxTimeToLive ? { maxTimeToLive } : {}),
      onSuccess: resolve,
      onError: reject,
    })
  );
  // console.log("loginWithII");
  const identity = authClient.getIdentity();
  // console.log("identity", identity);
  const principal = identity.getPrincipal().toString();
  // console.log("principal", principal);
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
