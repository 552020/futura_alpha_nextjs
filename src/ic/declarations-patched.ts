// Import the original declaration files
import * as backendDeclarations from './declarations/backend/index.js';
import * as iiDeclarations from './declarations/internet_identity/index.js';
import * as factoryDeclarations from './declarations/canister_factory/index.js';

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

// Patch the createActor functions to add health checks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const patchCreateActor = (originalCreateActor: (canisterId: string, options?: any) => any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (canisterId: string, options: any = {}) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { HttpAgent } = require('@dfinity/agent');
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
          agent.fetchRootKey().catch((err: unknown) => {
            console.warn('Unable to fetch root key. ICP may be unavailable');
            console.error(err);
          });
        } else {
          console.warn('ICP network unavailable, skipping fetchRootKey to prevent crashes');
        }
      });
    }

    // Use the original createActor logic but with our safe agent
    return originalCreateActor(canisterId, { ...options, agent });
  };
};

// Create patched versions
const patchedBackend = {
  ...backendDeclarations,
  createActor: patchCreateActor(backendDeclarations.createActor),
};

const patchedII = {
  ...iiDeclarations,
  createActor: patchCreateActor(iiDeclarations.createActor),
};

const patchedFactory = {
  ...factoryDeclarations,
  createActor: patchCreateActor(factoryDeclarations.createActor),
};

// Export the patched versions
export { patchedBackend as backend };
export { patchedII as internet_identity };
export { patchedFactory as canister_factory };
