"use client";

import { idlFactory as backendIDL } from "@/ic/declarations/backend/backend.did.js";
import { canisterId as BACKEND_CANISTER_ID } from "@/ic/declarations/backend";
import { createAgent } from "./agent";
import { makeActor } from "./actor-factory";
import { Identity } from "@dfinity/agent";
import type { _SERVICE as Backend } from "@/ic/declarations/backend/backend.did";
import type { ActorSubclass } from "@dfinity/agent";

export type BackendActor = ActorSubclass<Backend>;

export async function backendActor(identity?: Identity): Promise<BackendActor> {
  const agent = await createAgent(identity);
  return makeActor(backendIDL, BACKEND_CANISTER_ID, agent);
}
