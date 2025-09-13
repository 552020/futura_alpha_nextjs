import { Actor, HttpAgent } from "@dfinity/agent";
import { webcrypto } from "node:crypto";
import { idlFactory } from "@/ic/declarations/backend/backend.did.js";

/**
 * Polyfill crypto for Node.js environment
 * This is required for @dfinity/agent to work in server-side environments
 */
function polyfillCrypto() {
  if (typeof global !== "undefined" && !global.crypto) {
    // @ts-expect-error Node global typing mismatch
    global.crypto = webcrypto;
  }
}

/**
 * Create a server-side actor for canister calls
 * This function handles the crypto polyfill and agent configuration
 */
export async function createServerSideActor() {
  // Polyfill crypto for Node.js environment
  polyfillCrypto();

  const agent = new HttpAgent({
    host: process.env.NEXT_PUBLIC_IC_HOST || "http://127.0.0.1:4943",
  });

  // For local development, we need to fetch the root key
  if (process.env.NEXT_PUBLIC_DFX_NETWORK === "local") {
    await agent.fetchRootKey();
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: process.env.NEXT_PUBLIC_CANISTER_ID_BACKEND!,
  });
}
