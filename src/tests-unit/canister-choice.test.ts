// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  parseCanisterChoice,
  resolveBackendCanisterId,
  type CanisterChoice,
} from '@/ic/canister-choice';

const SHARED = 'uxrrr-q7777-77774-qaaaq-cai';
const PERSONAL = 'vu5yx-eh777-77774-qaaga-cai';
const OWNER = 'aaaaa-aa';
const personal: CanisterChoice = {
  target: 'personal',
  canisterId: PERSONAL,
  principal: OWNER,
};

describe('resolveBackendCanisterId', () => {
  it('uses the shared canister by default', () => {
    expect(resolveBackendCanisterId(SHARED, { target: 'shared' }, OWNER)).toBe(
      SHARED
    );
    expect(resolveBackendCanisterId(SHARED, { target: 'shared' })).toBe(SHARED);
  });

  it('uses the personal canister for the principal that chose it', () => {
    expect(resolveBackendCanisterId(SHARED, personal, OWNER)).toBe(PERSONAL);
  });

  it('keeps another person on the same browser in the shared canister', () => {
    expect(resolveBackendCanisterId(SHARED, personal, '2vxsx-fae')).toBe(
      SHARED
    );
  });

  it('follows the choice for calls without an identity (file links)', () => {
    expect(resolveBackendCanisterId(SHARED, personal)).toBe(PERSONAL);
  });
});

describe('parseCanisterChoice', () => {
  it('reads back what was stored', () => {
    expect(parseCanisterChoice(JSON.stringify(personal))).toEqual(personal);
  });

  it('falls back to shared for nothing, junk or half a record', () => {
    expect(parseCanisterChoice(null)).toEqual({ target: 'shared' });
    expect(parseCanisterChoice('not json')).toEqual({ target: 'shared' });
    expect(
      parseCanisterChoice(
        JSON.stringify({ target: 'personal', canisterId: '' })
      )
    ).toEqual({ target: 'shared' });
    expect(
      parseCanisterChoice(
        JSON.stringify({ target: 'personal', canisterId: PERSONAL })
      )
    ).toEqual({ target: 'shared' });
  });
});
