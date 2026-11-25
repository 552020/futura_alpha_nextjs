/**
 * Which backend canister the app talks to on the Internet Computer: the
 * shared one (many users, one canister) or the user's personal canister.
 *
 * The choice is kept in this browser (localStorage), together with the
 * principal it belongs to, so that another person signing in on the same
 * browser does not end up in somebody else's canister. Another device starts
 * with the shared canister until the choice is made there too.
 *
 * Signing in with Internet Identity always uses the shared canister: the
 * server checks the sign-in proof there.
 */
export type CanisterChoice =
  | { target: 'shared' }
  | { target: 'personal'; canisterId: string; principal: string };

const KEY = 'futura.icp-canister-choice';
const SHARED: CanisterChoice = { target: 'shared' };

/** Parse what was stored; anything unexpected means "shared". */
export function parseCanisterChoice(raw: string | null): CanisterChoice {
  if (!raw) return SHARED;
  try {
    const v = JSON.parse(raw) as Partial<{
      target: string;
      canisterId: string;
      principal: string;
    }>;
    if (
      v.target === 'personal' &&
      typeof v.canisterId === 'string' &&
      v.canisterId.length > 0 &&
      typeof v.principal === 'string' &&
      v.principal.length > 0
    ) {
      return {
        target: 'personal',
        canisterId: v.canisterId,
        principal: v.principal,
      };
    }
  } catch {
    /* fall through */
  }
  return SHARED;
}

export function readCanisterChoice(): CanisterChoice {
  if (typeof window === 'undefined') return SHARED;
  try {
    return parseCanisterChoice(window.localStorage.getItem(KEY));
  } catch {
    return SHARED;
  }
}

export function writeCanisterChoice(choice: CanisterChoice): void {
  if (typeof window === 'undefined') return;
  try {
    if (choice.target === 'shared') {
      window.localStorage.removeItem(KEY);
    } else {
      window.localStorage.setItem(KEY, JSON.stringify(choice));
    }
  } catch {
    /* storage blocked: the app stays on the shared canister */
  }
}

/**
 * The canister id to call.
 * `caller` is the principal of the identity making the call, or undefined
 * for calls without an identity (public reads such as file links).
 * A signed call only goes to the personal canister of that same principal.
 */
export function resolveBackendCanisterId(
  sharedCanisterId: string,
  choice: CanisterChoice,
  caller?: string
): string {
  if (choice.target !== 'personal') return sharedCanisterId;
  if (caller !== undefined && caller !== choice.principal) {
    return sharedCanisterId;
  }
  return choice.canisterId;
}
