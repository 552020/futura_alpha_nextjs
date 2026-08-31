'use client';

import { Actor, HttpAgent } from '@dfinity/agent';

export function makeActor<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  idlFactory: any,
  canisterId: string,
  agent: HttpAgent
): T {
  return Actor.createActor(idlFactory, { agent, canisterId }) as unknown as T;
}
