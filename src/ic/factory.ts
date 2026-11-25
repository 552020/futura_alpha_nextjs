import type { ActorSubclass, Identity } from '@dfinity/agent';
import { createAgent } from './agent';
import { IS_LOCAL } from './env';
import { makeActor } from './actor-factory';
import { idlFactory as factoryIDL } from '@/ic/declarations/canister_factory/canister_factory.did.js';
import { idlFactory as backendIDL } from '@/ic/declarations/backend/backend.did.js';
import type { _SERVICE as Factory } from '@/ic/declarations/canister_factory/canister_factory.did';
import type { _SERVICE as Backend } from '@/ic/declarations/backend/backend.did';

export const FACTORY_CANISTER_ID = process.env.NEXT_PUBLIC_CANISTER_ID_FACTORY;

async function agentFor(identity: Identity) {
  const agent = await createAgent(identity);
  if (IS_LOCAL) {
    await agent.fetchRootKey().catch(() => undefined);
  }
  return agent;
}

/** The canister factory, called as the signed-in Internet Identity user. */
export async function factoryActor(
  identity: Identity
): Promise<ActorSubclass<Factory>> {
  if (!FACTORY_CANISTER_ID) {
    throw new Error('NEXT_PUBLIC_CANISTER_ID_FACTORY is not set');
  }
  return makeActor<ActorSubclass<Factory>>(
    factoryIDL,
    FACTORY_CANISTER_ID,
    await agentFor(identity)
  );
}

/** A user's personal canister: the backend program, at their own canister id. */
export async function personalBackendActor(
  identity: Identity,
  canisterId: string
): Promise<ActorSubclass<Backend>> {
  return makeActor<ActorSubclass<Backend>>(
    backendIDL,
    canisterId,
    await agentFor(identity)
  );
}
