// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { assetLinkUrl } from '@/lib/http-token-manager';

const base = 'http://backend.localhost:4943';

describe('assetLinkUrl', () => {
  it('appends the token with ? for plain variant paths', () => {
    expect(
      assetLinkUrl(base, { path: '/asset/m1/display', token: 'abc' })
    ).toBe(`${base}/asset/m1/display?token=abc`);
  });

  it('appends the token with & when the path already has a query (inline)', () => {
    expect(
      assetLinkUrl(base, { path: '/asset/m1/inline?id=a1', token: 'abc' })
    ).toBe(`${base}/asset/m1/inline?id=a1&token=abc`);
  });

  it('encodes characters that are not URL-safe', () => {
    expect(
      assetLinkUrl(base, { path: '/asset/m1/original', token: 'a+b/c=' })
    ).toBe(`${base}/asset/m1/original?token=a%2Bb%2Fc%3D`);
  });
});
