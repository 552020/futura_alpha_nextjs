/**
 * Internet Identity end-to-end tests.
 *
 * Runs against a local replica with the dev build of Internet Identity and the
 * Futura backend canister (see futura_alpha_icp/dfx.json; the local II has
 * captcha disabled through its init_arg). The app must be built and started
 * with NEXT_PUBLIC_DFX_NETWORK=local, NEXT_PUBLIC_IC_HOST,
 * NEXT_PUBLIC_CANISTER_ID_BACKEND and NEXT_PUBLIC_II_URL pointing at it.
 *
 * Each test gets a fresh browser context, so iiPage.signIn() creates a new
 * II identity (and therefore a new principal) per test.
 *
 * One II sign-in exercises: II popup -> backend capsule auto-creation ->
 * /api/ii/challenge -> register_with_nonce on the backend canister ->
 * NextAuth "ii" provider -> verify_nonce on the canister -> user in Postgres.
 */
import { testWithII, expect } from '@dfinity/internet-identity-playwright';
import type { Page } from '@playwright/test';

const HEADER_II_BUTTON = 'button:has-text("Sign in with Internet Identity")';
const II_START = '[data-testid="ii-start"]';
const PRINCIPAL = /^[a-z0-9]{5}(-[a-z0-9]{5})*-[a-z0-9]{3}$/;

async function openHeaderSignIn(page: Page) {
  await page.goto('/en');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Sign in with Internet Identity' })
  ).toBeVisible();
}

async function sessionUser(page: Page) {
  const res = await page.request.get('/api/auth/session');
  expect(res.ok()).toBeTruthy();
  return (await res.json())?.user ?? null;
}

testWithII.describe('Internet Identity authentication', () => {
  testWithII(
    'signs in from the header with a new identity',
    async ({ page, iiPage }) => {
      await openHeaderSignIn(page);
      await iiPage.signIn({ passkey: { selector: HEADER_II_BUTTON } });

      await expect(page.getByTestId('user-avatar')).toBeVisible();
      const user = await sessionUser(page);
      expect(user?.id).toBeTruthy();
      expect(user?.loginProvider).toBe('ii');
      expect(user?.linkedIcPrincipals).toHaveLength(1);
      expect(user?.linkedIcPrincipals[0]).toMatch(PRINCIPAL);
    }
  );

  testWithII(
    'runs the challenge and canister nonce steps during sign-in',
    async ({ page, iiPage }) => {
      await page.goto('/en/sign-ii-only?callbackUrl=%2Fen%2Fdashboard');

      const challenge = page.waitForResponse((r) =>
        r.url().includes('/api/ii/challenge')
      );
      const nextAuthCallback = page.waitForResponse((r) =>
        r.url().includes('/api/auth/callback/ii')
      );

      await iiPage.signIn({ passkey: { selector: II_START } });

      expect((await challenge).ok()).toBeTruthy();
      // The NextAuth "ii" provider only succeeds if verify_nonce on the
      // backend canister returns the principal that registered the nonce.
      expect((await nextAuthCallback).status()).toBeLessThan(400);
      await expect(page.getByTestId('user-avatar')).toBeVisible();
    }
  );

  testWithII(
    'returns to the callbackUrl after sign-in',
    async ({ page, iiPage }) => {
      const target = '/en/dashboard?view=memories';
      await page.goto(
        `/en/sign-ii-only?callbackUrl=${encodeURIComponent(target)}`
      );
      await iiPage.signIn({ passkey: { selector: II_START } });

      await expect(page).toHaveURL(
        new RegExp(`${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
      );
      await expect(page.getByTestId('user-avatar')).toBeVisible();
    }
  );

  testWithII('keeps the locale in the callback', async ({ page, iiPage }) => {
    await page.goto('/de/sign-ii-only?callbackUrl=%2Fde%2Fdashboard');
    await iiPage.signIn({ passkey: { selector: II_START } });

    await expect(page).toHaveURL(/\/de\/dashboard/);
    await expect(page.getByTestId('user-avatar')).toBeVisible();
  });

  testWithII(
    'shows the connected state and principal on the ICP page',
    async ({ page, iiPage }) => {
      await openHeaderSignIn(page);
      await iiPage.signIn({ passkey: { selector: HEADER_II_BUTTON } });
      await expect(page.getByTestId('user-avatar')).toBeVisible();

      await page.goto('/en/user/icp');
      await expect(page.getByText('Connected', { exact: true })).toBeVisible();
      await expect(page.getByText(/^[a-z0-9]{5}…[a-z0-9-]{5}$/)).toBeVisible();
      await expect(
        page.getByText('Sign Out from Internet Identity')
      ).toBeVisible();
    }
  );

  testWithII(
    'signs out from Internet Identity on the ICP page',
    async ({ page, iiPage }) => {
      await openHeaderSignIn(page);
      await iiPage.signIn({ passkey: { selector: HEADER_II_BUTTON } });
      await expect(page.getByTestId('user-avatar')).toBeVisible();

      await page.goto('/en/user/icp');
      await page.getByText('Sign Out from Internet Identity').click();

      await expect(
        page.getByText('Not Connected', { exact: true })
      ).toBeVisible();
      await expect(page.getByTestId('ii-connect')).toBeVisible();
    }
  );

  testWithII(
    'links an Internet Identity to an existing email account',
    async ({ page, iiPage }) => {
      // The II helper reuses one identity ("Test"), whose principal earlier
      // tests already own as II-only accounts. Linking it again is correctly
      // refused (409 PRINCIPAL_CONFLICT), so first free it: sign in with II,
      // unlink the principal from that account, then drop the session.
      await openHeaderSignIn(page);
      await iiPage.signIn({ passkey: { selector: HEADER_II_BUTTON } });
      await expect(page.getByTestId('user-avatar')).toBeVisible();
      const iiUser = await sessionUser(page);
      const principal: string = iiUser?.linkedIcPrincipals?.[0];
      expect(principal).toMatch(PRINCIPAL);
      const unlink = await page.request.post('/api/auth/ii/unlink', {
        data: { principal },
      });
      expect(unlink.status(), await unlink.text()).toBe(200);
      await page.context().clearCookies();

      // Fresh email user so the test does not depend on seeded data
      const email = `ii-link-${Date.now()}@example.com`;
      const password = 'local-test-password-123';
      const signup = await page.request.post('/api/auth/signup', {
        data: { email, password },
      });
      expect(signup.ok()).toBeTruthy();

      await page.goto('/en/signin');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Sign in with Email' }).click();
      await expect(page.getByTestId('user-avatar')).toBeVisible();
      const before = await sessionUser(page);
      expect(before?.email).toBe(email);
      expect(before?.linkedIcPrincipals ?? []).toHaveLength(0);

      await page.goto('/en/user/icp');
      // The II client from the first step is still signed in in this browser
      await page.getByText('Sign Out from Internet Identity').click();
      await page.getByTestId('ii-connect').click();
      await expect(page).toHaveURL(/\/en\/sign-ii-only\?callbackUrl=/);

      const linkCall = page.waitForResponse(
        (r) =>
          r.url().includes('/api/auth/link-ii') &&
          r.request().method() === 'POST'
      );
      await iiPage.signIn({ passkey: { selector: II_START } });
      const linkRes = await linkCall;
      expect(linkRes.status(), await linkRes.text()).toBe(200);

      // The page updates the session, then redirects to the callback URL
      await expect(page).not.toHaveURL(/sign-ii-only/);

      // Same account, now with one II principal linked to it
      const after = await sessionUser(page);
      expect(after?.id).toBe(before?.id);
      expect(after?.linkedIcPrincipals).toEqual([principal]);
      await page.goto('/en/user/icp');
      await expect(page.getByText('1 linked')).toBeVisible();
    }
  );

  testWithII(
    'shows an error when the challenge service fails',
    async ({ page, iiPage }) => {
      await page.route('**/api/ii/challenge', (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Challenge service unavailable' }),
        })
      );
      await page.goto('/en/sign-ii-only?callbackUrl=%2Fen%2Fdashboard');

      // The II popup still completes; the app fails at the challenge step
      await iiPage.signIn({ passkey: { selector: II_START } });
      await expect(
        page.getByText(/Internet Identity linking failed/)
      ).toBeVisible();
      await expect(page.getByTestId('user-avatar')).toHaveCount(0);
    }
  );
});
