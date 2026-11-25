/**
 * Personal canisters (Juno-style): the factory creates one canister per user
 * and hands it over, so the user is its only controller. This module turns
 * the factory's replies into what the UI shows. Pure functions, no network.
 */
import type {
  PersonalCanister,
  ReleaseInfo,
} from '@/ic/declarations/canister_factory/canister_factory.did';

export type PersonalCanisterView =
  | { state: 'none' }
  | {
      state: 'creating';
      step: 'pending' | 'created' | 'installed';
      error?: string;
    }
  | {
      state: 'ready';
      canisterId: string;
      version: string | null;
      /** A newer release is available in the factory */
      updateAvailable: boolean;
      latestVersion: string | null;
    };

function statusKey(entry: PersonalCanister): string {
  return Object.keys(entry.status)[0] ?? 'Pending';
}

export function personalCanisterView(
  entry: PersonalCanister | undefined,
  release: ReleaseInfo | undefined
): PersonalCanisterView {
  if (!entry) return { state: 'none' };
  const status = statusKey(entry);
  const canisterId = entry.canister_id[0]?.toText();
  if (status !== 'Ready' || !canisterId) {
    return {
      state: 'creating',
      step: status.toLowerCase() as 'pending' | 'created' | 'installed',
      error: entry.last_error[0],
    };
  }
  const installedSha = entry.module_sha256_hex[0] ?? null;
  return {
    state: 'ready',
    canisterId,
    version: entry.version[0] ?? null,
    // Compared by hash, not by version label: the registry records what the
    // factory installed; an owner who upgraded themselves is ahead of it.
    updateAvailable:
      !!release && !!installedSha && release.sha256_hex !== installedSha,
    latestVersion: release?.version ?? null,
  };
}
