import { HttpAgent, type Identity } from '@dfinity/agent';

const host =
  process.env.NEXT_PUBLIC_IC_HOST ??
  (process.env.NEXT_PUBLIC_DFX_NETWORK === 'ic' ? 'https://icp-api.io' : 'http://127.0.0.1:4943');

const agentCache = new Map<string, Promise<HttpAgent>>(); // key = principal or "anon"

export function createAgent(identity?: Identity): Promise<HttpAgent> {
  const key = identity ? identity.getPrincipal().toText() : 'anon';
  if (!agentCache.has(key)) {
    const created = (async () => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('ICP connection timeout')), 8000);
        });
        
        const agentPromise = HttpAgent.create({ host, identity });
        const agent = await Promise.race([agentPromise, timeoutPromise]);
        
        if (process.env.NEXT_PUBLIC_DFX_NETWORK !== 'ic') {
          // dev/local only - handle gracefully if ICP replica is not running
          try {
            await agent.fetchRootKey();
          } catch (fetchError) {
            fatLogger.warn('⚠️ ICP replica not available. ICP features will be disabled.', 'fe');
            fatLogger.warn('To enable ICP features, run: dfx start', 'fe');
            // Don't throw - let the app continue without ICP functionality
            // The agent is still valid, just without root key verification
          }
        }
        return agent;
      } catch (e) {
        // IMPORTANT: prevent cache poisoning on failure
        agentCache.delete(key);
        fatLogger.warn('ICP agent creation failed:', 'fe', { error: e });
        throw e;
      }
    })();

    agentCache.set(key, created);
  }
  return agentCache.get(key)!;
}

/**
 * Clear the agent cache, typically called on logout to avoid stale sessions
 */
export function clearAgentCache(): void {
  agentCache.clear();
}

// "use client";

// import { HttpAgent } from "@dfinity/agent";

// let cached: Promise<HttpAgent> | null = null;

// export function createAgent(): Promise<HttpAgent> {
//   if (!cached) {
//     const host =
//       process.env.NEXT_PUBLIC_IC_HOST ??
//       (process.env.NEXT_PUBLIC_DFX_NETWORK === "ic" ? "https://icp-api.io" : "http://127.0.0.1:4943");

//     cached = HttpAgent.create({
//       host,
//       shouldFetchRootKey: process.env.NEXT_PUBLIC_DFX_NETWORK !== "ic",
//     });
//   }
//   return cached;
// }

/* ORIGINAL CODE form declarations/backend/index.js*/

// "use client";

// import { HttpAgent } from "@dfinity/agent";

// export function createAgent() {
//   const host =
//     process.env.NEXT_PUBLIC_IC_HOST ??
//     (process.env.NEXT_PUBLIC_DFX_NETWORK === "ic" ? "https://icp-api.io" : "http://127.0.0.1:4943");

//   const agent = new HttpAgent({ host });

//   if (process.env.NEXT_PUBLIC_DFX_NETWORK !== "ic") {
//     // only for local replica
//     agent.fetchRootKey().catch((err) => {
//       fatLogger.warn("fetchRootKey failed; is local replica running?");
//       fatLogger.error(err);
//     });
//   }

//   return agent;
// }

/* NEWER SOLUTION less optimized */

// "use client";

// import { HttpAgent } from "@dfinity/agent";

import { fatLogger } from '@/lib/logger';
// export async function createAgent() {
//   const host =
//     process.env.NEXT_PUBLIC_IC_HOST ??
//     (process.env.NEXT_PUBLIC_DFX_NETWORK === "ic" ? "https://icp-api.io" : "http://127.0.0.1:4943");

//   const agent = await HttpAgent.create({ host });

//   if (process.env.NEXT_PUBLIC_DFX_NETWORK !== "ic") {
//     // only for local replica
//     agent.fetchRootKey().catch((err) => {
//       fatLogger.warn("fetchRootKey failed; is local replica running?");
//       fatLogger.error(err);
//     });
//   }

//   return agent;
// }
