/**
 * Personal canister, through the app: a user signs in with Internet Identity,
 * creates their personal canister on the ICP page, and the canister itself
 * confirms that it belongs to them.
 *
 * Needs the local setup of e2e/README.md plus the factory with a release:
 * in futura_alpha_icp run `dfx deploy canister_factory`, give it cycles
 * (`dfx ledger fabricate-cycles --canister canister_factory --t 20`) and
 * `scripts/factory-release.sh 0.1.0`. The app must be built with
 * NEXT_PUBLIC_CANISTER_ID_FACTORY.
 */
import { testWithII, expect } from '@dfinity/internet-identity-playwright';

testWithII(
  'a user creates their personal canister and is its only owner',
  async ({ page, iiPage }) => {
    testWithII.setTimeout(120_000);
    await page.goto('/en');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await iiPage.signIn({
      passkey: {
        selector: 'button:has-text("Sign in with Internet Identity")',
      },
    });
    await expect(page.getByTestId('user-avatar')).toBeVisible();

    await page.goto('/en/user/icp');
    const card = page.getByTestId('personal-canister-card');
    await expect(card).toBeVisible();

    // The II helper reuses one identity per run, so an earlier test may have
    // created the canister already: both paths end in the same state.
    const create = page.getByTestId('personal-canister-create');
    const id = page.getByTestId('personal-canister-id');
    await expect(create.or(id)).toBeVisible({ timeout: 30_000 });
    if (await create.isVisible()) {
      await create.click();
    }

    await expect(id).toHaveText(/^[a-z0-9]{5}(-[a-z0-9]{3,5})+$/, {
      timeout: 90_000,
    });
    // Asked from the canister itself: personal mode, owner = this user
    await expect(page.getByTestId('personal-canister-mode')).toHaveText(
      'Only you'
    );

    // It survives a reload: the factory's registry remembers it
    const canisterId = await id.textContent();
    await page.reload();
    await expect(page.getByTestId('personal-canister-id')).toHaveText(
      canisterId!
    );
  }
);
