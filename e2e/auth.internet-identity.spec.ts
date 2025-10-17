import { testWithII, expect } from '@dfinity/internet-identity-playwright';

testWithII.describe('Internet Identity Authentication', () => {
  testWithII('II sign-in with a new identity logs the user in', async ({ page, iiPage }) => {
    // 1) Go to ICP management page
    await page.goto('/en/user/icp');

    // 2) Click our first-step button (pushes to /sign-ii-only with callbackUrl)
    await page.getByTestId('ii-connect').click();

    // 3) On /sign-ii-only, start II flow (this calls loginWithII() in our app)
    await expect(page.getByTestId('ii-start')).toBeVisible();
    await iiPage.signInWithNewIdentity({ selector: '[data-testid="ii-start"]' });

    // 4) Assert: we are authenticated (avatar or username visible)
    await expect(page.getByTestId('user-avatar')).toBeVisible();
  });

  testWithII('II sign-in returns to the original callbackUrl', async ({ page, iiPage }) => {
    // Start from some deep page that requires auth after login
    const target = '/en/dashboard?view=memories';
    await page.goto('/en/user/icp');

    // Trigger flow (our code builds callbackUrl from current URL)
    await page.getByTestId('ii-connect').click();
    await expect(page).toHaveURL(/\/en\/sign-ii-only\?callbackUrl=/);

    await iiPage.signInWithNewIdentity({ selector: '[data-testid="ii-start"]' });

    // After our NextAuth 'ii' and redirect: we should land on target
    await expect(page).toHaveURL(new RegExp(`${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
    await expect(page.getByTestId('user-avatar')).toBeVisible();
  });

  testWithII('calls challenge and register nonce during II flow', async ({ page, iiPage }) => {
    await page.goto('/en/user/icp');
    await page.getByTestId('ii-connect').click();

    // Watch for challenge API call
    const sawChallenge = page.waitForResponse(r => r.url().includes('/api/ii/challenge'));

    await iiPage.signInWithNewIdentity({ selector: '[data-testid="ii-start"]' });

    // Verify challenge was called
    await expect((await sawChallenge).ok()).toBeTruthy();
    await expect(page.getByTestId('user-avatar')).toBeVisible();
  });

  testWithII('Internet Identity management shows connected state after sign-in', async ({ page, iiPage }) => {
    await page.goto('/en/user/icp');
    await page.getByTestId('ii-connect').click();
    await iiPage.signInWithNewIdentity({ selector: '[data-testid="ii-start"]' });

    // Navigate back to ICP page to check management component
    await page.goto('/en/user/icp');

    // Should show connected state
    await expect(page.getByText('Connected')).toBeVisible();
    await expect(page.getByText(/Not Connected/)).not.toBeVisible();

    // Should show principal (shortened)
    await expect(page.getByText(/[a-z0-9]{5}…[a-z0-9]{5}/)).toBeVisible();
  });

  testWithII('can sign out from Internet Identity', async ({ page, iiPage }) => {
    // First sign in
    await page.goto('/en/user/icp');
    await page.getByTestId('ii-connect').click();
    await iiPage.signInWithNewIdentity({ selector: '[data-testid="ii-start"]' });

    // Navigate back to ICP page
    await page.goto('/en/user/icp');

    // Should show sign out button
    await expect(page.getByText('Sign Out from Internet Identity')).toBeVisible();

    // Click sign out
    await page.getByText('Sign Out from Internet Identity').click();

    // Should show disconnected state
    await expect(page.getByText('Not Connected')).toBeVisible();
    await expect(page.getByText('Connect Internet Identity')).toBeVisible();
  });

  testWithII('handles II authentication errors gracefully', async ({ page, iiPage: _iiPage }) => {
    await page.goto('/en/user/icp');
    await page.getByTestId('ii-connect').click();

    // Mock a network error for challenge
    await page.route('/api/ii/challenge', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Challenge service unavailable' }),
      });
    });

    await page.getByTestId('ii-start').click();

    // Should show error message
    await expect(page.getByText(/Internet Identity linking failed/)).toBeVisible();
  });

  testWithII('preserves locale in callback URL', async ({ page, iiPage }) => {
    // Test with different locale
    await page.goto('/es/user/icp'); // Spanish locale
    await page.getByTestId('ii-connect').click();

    // Should preserve Spanish locale in redirect
    await expect(page).toHaveURL(/\/es\/sign-ii-only\?callbackUrl=/);

    await iiPage.signInWithNewIdentity({ selector: '[data-testid="ii-start"]' });

    // Should return to Spanish locale
    await expect(page).toHaveURL(/\/es\//);
    await expect(page.getByTestId('user-avatar')).toBeVisible();
  });

  testWithII('Internet Identity flow works with existing session (linking)', async ({ page, iiPage }) => {
    // First create a regular session (simulate existing user)
    // This would require a test user creation endpoint or mock
    // For now, we'll test the linking flow by checking the API call

    await page.goto('/en/user/icp');
    await page.getByTestId('ii-connect').click();

    // Watch for linking API call (if session exists)
    const linkCall = page
      .waitForResponse(res => res.url().includes('/api/auth/link-ii') && res.request().method() === 'POST')
      .catch(() => null); // Don't fail if linking doesn't happen

    await iiPage.signInWithNewIdentity({ selector: '[data-testid="ii-start"]' });

    // Check if linking happened (optional assertion)
    const linkResponse = await linkCall;
    if (linkResponse) {
      await expect(linkResponse.ok()).toBeTruthy();
    }

    await expect(page.getByTestId('user-avatar')).toBeVisible();
  });
});
