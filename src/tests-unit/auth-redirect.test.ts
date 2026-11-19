// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { resolveAuthRedirect } from '@/lib/auth-redirect';

const base = 'https://futura.example';

describe('resolveAuthRedirect', () => {
  it('sends sign-in and callback URLs to the localized dashboard', () => {
    expect(resolveAuthRedirect(`${base}/api/auth/signin?lang=de`, base)).toBe(
      `${base}/de/dashboard`
    );
    expect(resolveAuthRedirect('/api/auth/callback/ii', base)).toBe(
      `${base}/en/dashboard`
    );
  });

  it('makes relative callback URLs absolute (signIn redirect:false needs it)', () => {
    expect(resolveAuthRedirect('/en/dashboard?view=memories', base)).toBe(
      `${base}/en/dashboard?view=memories`
    );
  });

  it('keeps same-origin absolute URLs', () => {
    expect(resolveAuthRedirect(`${base}/de/user/icp`, base)).toBe(
      `${base}/de/user/icp`
    );
  });

  it('blocks redirects to other origins (open redirect)', () => {
    expect(resolveAuthRedirect('https://evil.example/phish', base)).toBe(base);
    expect(resolveAuthRedirect('not a url', base)).toBe(base);
  });

  it('keeps protocol-relative paths on our origin', () => {
    expect(resolveAuthRedirect('//evil.example/x', base)).toBe(
      `${base}//evil.example/x`
    );
    expect(new URL(resolveAuthRedirect('//evil.example/x', base)).origin).toBe(
      base
    );
  });
});
