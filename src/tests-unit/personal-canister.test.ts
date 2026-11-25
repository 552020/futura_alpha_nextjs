// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Principal } from '@dfinity/principal';
import {
  mayCreatePersonalCanister,
  personalCanisterView,
} from '@/services/personal-canister';
import type {
  PersonalCanister,
  ReleaseInfo,
} from '@/ic/declarations/canister_factory/canister_factory.did';

const owner = Principal.fromText('aaaaa-aa');
const canister = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');

const entry = (over: Partial<PersonalCanister> = {}): PersonalCanister => ({
  owner,
  canister_id: [canister],
  status: { Ready: null },
  version: ['0.1.0'],
  module_sha256_hex: ['aaa'],
  created_at: BigInt(1),
  updated_at: BigInt(2),
  busy: false,
  last_error: [],
  top_up: [],
  ...over,
});
const release = (sha: string, version = '0.2.0'): ReleaseInfo => ({
  version,
  sha256_hex: sha,
  size: BigInt(1),
  released_at: BigInt(1),
});

describe('personalCanisterView', () => {
  it('is "none" when the factory has no entry', () => {
    expect(personalCanisterView(undefined, release('aaa'))).toEqual({
      state: 'none',
    });
  });

  it('shows a ready canister with its id and version', () => {
    expect(personalCanisterView(entry(), release('aaa', '0.1.0'))).toEqual({
      state: 'ready',
      canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
      version: '0.1.0',
      updateAvailable: false,
      latestVersion: '0.1.0',
    });
  });

  it('offers an update when the release hash differs from what was installed', () => {
    const v = personalCanisterView(entry(), release('bbb'));
    expect(v).toMatchObject({ state: 'ready', updateAvailable: true });
    // no release known: nothing to offer
    expect(personalCanisterView(entry(), undefined)).toMatchObject({
      updateAvailable: false,
      latestVersion: null,
    });
  });

  it('reports where an unfinished creation stopped, with the error', () => {
    expect(
      personalCanisterView(
        entry({ status: { Created: null }, last_error: ['install failed'] }),
        undefined
      )
    ).toEqual({ state: 'creating', step: 'created', error: 'install failed' });
    // "Ready" without a canister id is not ready
    expect(
      personalCanisterView(entry({ canister_id: [] }), undefined).state
    ).toBe('creating');
  });
});

describe('mayCreatePersonalCanister', () => {
  it('needs a credit while the factory is closed', () => {
    expect(mayCreatePersonalCanister(0, false)).toBe(false);
    expect(mayCreatePersonalCanister(1, false)).toBe(true);
  });

  it('needs none when the factory is open (local test networks)', () => {
    expect(mayCreatePersonalCanister(0, true)).toBe(true);
  });
});
