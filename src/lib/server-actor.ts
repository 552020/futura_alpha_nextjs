import { Actor, HttpAgent } from '@dfinity/agent';
import { webcrypto } from 'node:crypto';
import { idlFactory } from '@/ic/declarations/backend/backend.did.js';
import { isIcpAvailable } from '@/ic/health';
import { IS_LOCAL } from '@/ic/env';

/**
 * Polyfill crypto for Node.js environment
 * This is required for @dfinity/agent to work in server-side environments
 */
function polyfillCrypto() {
  if (typeof global !== 'undefined' && !global.crypto) {
    // @ts-expect-error Node global typing mismatch
    global.crypto = webcrypto;
  }
}

/**
 * Create a server-side actor for canister calls
 * This function handles the crypto polyfill and agent configuration
 * Now includes health check to prevent crashes
 */
export async function createServerSideActor() {
  // Polyfill crypto for Node.js environment
  polyfillCrypto();

  // Check if ICP is available before creating agent
  const isAvailable = await isIcpAvailable();
  if (!isAvailable) {
    throw new Error('ICP network is not available');
  }

  const agent = new HttpAgent({
    host: process.env.NEXT_PUBLIC_IC_HOST || 'http://127.0.0.1:4943',
  });

  // For local development, we need to fetch the root key
  // Only call fetchRootKey after health check and only on local
  if (IS_LOCAL) {
    try {
      await agent.fetchRootKey();
    } catch {
      // Swallow error - continue without root key verification
    }
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: process.env.NEXT_PUBLIC_CANISTER_ID_BACKEND!,
  });
}
