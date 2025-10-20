import { HttpAgent, type Identity } from '@dfinity/agent';
import { HOST } from './env';

const agentCache = new Map<string, Promise<HttpAgent>>();

/**
 * Creates an ICP HttpAgent for the given identity
 * This is now simplified - no network calls, no fetchRootKey()
 *
 * @param identity - Optional ICP identity (anonymous if not provided)
 * @returns Promise that resolves to HttpAgent
 */
export function createAgent(identity?: Identity): Promise<HttpAgent> {
  const key = identity ? identity.getPrincipal().toText() : 'anon';
  const cached = agentCache.get(key);
  if (cached) return cached;

  const agentPromise = HttpAgent.create({ host: HOST, identity }).catch(e => {
    agentCache.delete(key);
    throw e;
  });

  agentCache.set(key, agentPromise);
  return agentPromise;
}

/**
 * Clear the agent cache, typically called on logout to avoid stale sessions
 */
export function clearAgentCache(): void {
  agentCache.clear();
}
