import { isIcpAvailable } from './health';
import { createAgent } from './agent';
import { IS_LOCAL } from './env';
import { idlFactory as backendIDL } from '@/ic/declarations/backend/backend.did.js';
import { canisterId as BACKEND_CANISTER_ID } from '@/ic/declarations/backend';
import { makeActor } from './actor-factory';
import type { Identity, ActorSubclass } from '@dfinity/agent';
import type { _SERVICE as Backend } from '@/ic/declarations/backend/backend.did';

export type BackendActor = ActorSubclass<Backend>;
export type IcpInit =
  | { status: 'connected'; actor: BackendActor }
  | { status: 'offline'; reason: string };

/**
 * Creates a backend actor with preflight health check and lazy fetchRootKey()
 * This is the safe version that prevents crashes when ICP is unavailable
 *
 * @param identity - Optional ICP identity (anonymous if not provided)
 * @returns Promise<IcpInit> - Status object with actor or offline reason
 */
export async function backendActorSafe(identity?: Identity): Promise<IcpInit> {
  // 1) Preflight health check
  if (!(await isIcpAvailable())) {
    return { status: 'offline', reason: 'boundary-unavailable' };
  }

  try {
    // 2) Build agent (no network calls yet)
    const agent = await createAgent(identity);

    // 3) Local-only root key, guarded by preflight
    if (IS_LOCAL) {
      try {
        await agent.fetchRootKey();
      } catch {
        /* swallow → degrade later */
      }
    }

    // 4) Create actor
    const actor = makeActor(
      backendIDL,
      BACKEND_CANISTER_ID,
      agent
    ) as BackendActor;
    return { status: 'connected', actor };
  } catch (e: unknown) {
    return {
      status: 'offline',
      reason: e instanceof Error ? e.message : 'unknown',
    };
  }
}

/**
 * Legacy backend actor function (throws errors)
 * @deprecated Use backendActorSafe instead
 */
export async function backendActor(identity?: Identity): Promise<BackendActor> {
  const result = await backendActorSafe(identity);
  if (result.status === 'offline') {
    throw new Error(`ICP service unavailable: ${result.reason}`);
  }
  return result.actor;
}
