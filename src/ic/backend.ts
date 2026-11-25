import { isIcpAvailable } from './health';
import { createAgent } from './agent';
import { IS_LOCAL } from './env';
import { idlFactory as backendIDL } from '@/ic/declarations/backend/backend.did.js';
import { canisterId as BACKEND_CANISTER_ID } from '@/ic/declarations/backend';
import { makeActor } from './actor-factory';
import {
  readCanisterChoice,
  resolveBackendCanisterId,
} from './canister-choice';
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
export async function backendActorSafe(
  identity?: Identity,
  options: { shared?: boolean } = {}
): Promise<IcpInit> {
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
    //    The shared canister, or the user's personal one if they chose it
    //    in the settings (see canister-choice.ts)
    const canisterId = options.shared
      ? BACKEND_CANISTER_ID
      : activeBackendCanisterId(identity);
    const actor = makeActor(backendIDL, canisterId, agent) as BackendActor;
    return { status: 'connected', actor };
  } catch (e: unknown) {
    return {
      status: 'offline',
      reason: e instanceof Error ? e.message : 'unknown',
    };
  }
}

/**
 * The canister the app talks to right now: the shared one, or the personal
 * canister chosen in the settings (only for the identity it belongs to).
 */
export function activeBackendCanisterId(identity?: Identity): string {
  return resolveBackendCanisterId(
    BACKEND_CANISTER_ID as string,
    readCanisterChoice(),
    identity?.getPrincipal().toText()
  );
}

/**
 * Always the shared canister, whatever the user chose. For the Internet
 * Identity sign-in handshake: the server checks the proof there.
 */
export async function sharedBackendActor(
  identity?: Identity
): Promise<BackendActor> {
  const result = await backendActorSafe(identity, { shared: true });
  if (result.status === 'offline') {
    throw new Error(`ICP service unavailable: ${result.reason}`);
  }
  return result.actor;
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
