'use client';

import { idlFactory as backendIDL } from '@/ic/declarations/backend/backend.did.js';
import { canisterId as BACKEND_CANISTER_ID } from '@/ic/declarations/backend';
import { createAgent } from './agent';
import { makeActor } from './actor-factory';
import { Identity } from '@dfinity/agent';
import type { _SERVICE as Backend } from '@/ic/declarations/backend/backend.did';
import type { ActorSubclass } from '@dfinity/agent';

export type BackendActor = ActorSubclass<Backend>;

export type IcpInit = { status: 'connected'; actor: BackendActor } | { status: 'offline'; reason: string };

export async function backendActor(identity?: Identity): Promise<BackendActor> {
  try {
    const agent = await createAgent(identity);
    return makeActor(backendIDL, BACKEND_CANISTER_ID, agent);
  } catch (_error) {
    console.warn('ICP unavailable');
    throw new Error('ICP service unavailable. Please try again later.');
  }
}

export async function backendActorSafe(identity?: Identity): Promise<IcpInit> {
  try {
    const agent = await createAgent(identity);
    const actor = makeActor(backendIDL, BACKEND_CANISTER_ID, agent) as BackendActor;
    return { status: 'connected', actor };
  } catch (e: unknown) {
    console.warn('[ICP] init failed; Neon-only mode:', e);
    return { status: 'offline', reason: e instanceof Error ? e.message : 'unknown' };
  }
}
