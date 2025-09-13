"use client";

import { Actor, HttpAgent } from "@dfinity/agent";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeActor<T>(idlFactory: any, canisterId: string, agent: HttpAgent): T {
  return Actor.createActor(idlFactory, { agent, canisterId }) as unknown as T;
}
