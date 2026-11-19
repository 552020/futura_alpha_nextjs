/**
 * NextAuth redirect policy (used by the `redirect` callback in auth.ts).
 *
 * - Sign-in / callback URLs land on the localized dashboard.
 * - Relative paths become absolute on our origin.
 * - Same-origin absolute URLs pass through.
 * - Anything else (other origins, invalid URLs) falls back to baseUrl,
 *   so a crafted callbackUrl cannot redirect users off-site.
 */
export function resolveAuthRedirect(url: string, baseUrl: string): string {
  const isLoginFlow =
    url.includes('/api/auth/signin') || url.includes('/api/auth/callback');

  if (isLoginFlow) {
    let lang = 'en';
    try {
      lang = new URL(url).searchParams.get('lang') || 'en';
    } catch {
      lang = 'en';
    }
    return `${baseUrl}/${lang}/dashboard`;
  }

  // Relative path: make it absolute. `signIn(..., { redirect: false })` on
  // the client does `new URL(data.url)`, which throws on relative URLs.
  if (url.startsWith('/')) return `${baseUrl}${url}`;

  try {
    if (new URL(url).origin === new URL(baseUrl).origin) return url;
  } catch {
    // invalid URL: fall through
  }
  return baseUrl;
}
