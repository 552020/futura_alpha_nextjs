import { Actor, HttpAgent } from '@dfinity/agent';

// Imports and re-exports candid interface
import { idlFactory } from './canister_factory.did.js';
export { idlFactory } from './canister_factory.did.js';

/* CANISTER_ID is replaced by webpack based on node environment
 * Note: canister environment variable will be standardized as
 * process.env.CANISTER_ID_<CANISTER_NAME_UPPERCASE>
 * beginning in dfx 0.15.0
 */
export const canisterId = process.env.NEXT_PUBLIC_CANISTER_ID_FACTORY;

// Health check function to prevent crashes when ICP is unavailable
const isIcpAvailable = async () => {
  try {
    const host = process.env.NEXT_PUBLIC_IC_HOST || 'http://127.0.0.1:4943';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${host}/api/v2/status`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
};

export const createActor = (canisterId, options = {}) => {
  const agent = options.agent || new HttpAgent({ ...options.agentOptions });

  if (options.agent && options.agentOptions) {
    console.warn(
      'Detected both agent and agentOptions passed to createActor. Ignoring agentOptions and proceeding with the provided agent.'
    );
  }

  // SAFE fetchRootKey with health check - only call if ICP is available
  if (process.env.NEXT_PUBLIC_DFX_NETWORK !== 'ic') {
    // Check if ICP is available before calling fetchRootKey
    isIcpAvailable().then(available => {
      if (available) {
        agent.fetchRootKey().catch(err => {
          console.warn('Unable to fetch root key. ICP may be unavailable');
          console.error(err);
        });
      } else {
        console.warn('ICP network unavailable, skipping fetchRootKey to prevent crashes');
      }
    });
  }

  // Creates an actor with using the candid interface and the HttpAgent
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
    ...options.actorOptions,
  });
};

export const canister_factory = canisterId ? createActor(canisterId) : undefined;
