/**
 * Settings: shared canister or my own canister.
 *
 * A user with a personal canister chooses it in the settings; the app then
 * talks to that canister, the choice survives a reload, and signing in with
 * Internet Identity still works (the handshake stays on the shared canister).
 *
 * Needs the same local setup as personal-canister.spec.ts (factory with a
 * release, creation open).
 */
import { testWithII, expect } from '@dfinity/internet-identity-playwright';

const II_BUTTON = 'button:has-text("Sign in with Internet Identity")';
const CANISTER_ID = /^[a-z0-9]{5}(-[a-z0-9]{3,5})+$/;

testWithII(
  'a user switches from the shared canister to their own and back',
  async ({ page, iiPage }) => {
    testWithII.setTimeout(180_000);
    await page.goto('/en');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await iiPage.signIn({ passkey: { selector: II_BUTTON } });
    await expect(page.getByTestId('user-avatar')).toBeVisible({
      timeout: 20_000,
    });

    // Make sure the user has a personal canister
    await page.goto('/en/user/icp');
    const create = page.getByTestId('personal-canister-create');
    const id = page.getByTestId('personal-canister-id');
    await expect(create.or(id)).toBeVisible({ timeout: 30_000 });
    if (await create.isVisible()) await create.click();
    await expect(id).toHaveText(CANISTER_ID, { timeout: 90_000 });
    const personalId = (await id.textContent())!;

    // Settings: the shared canister is in use by default
    await page.goto('/en/user/settings');
    const card = page.getByTestId('canister-choice-card');
    await expect(card).toBeVisible();
    const shared = page.getByTestId('canister-choice-shared');
    const personal = page.getByTestId('canister-choice-personal');
    const active = page.getByTestId('canister-choice-active');
    await expect(shared).toBeChecked({ timeout: 30_000 });
    const sharedId = (await active.textContent())!;
    expect(sharedId).toMatch(CANISTER_ID);
    expect(sharedId).not.toBe(personalId);

    // Choose my own canister: the page reloads and now uses it
    await personal.click();
    await expect(active).toHaveText(personalId, { timeout: 60_000 });
    await expect(personal).toBeChecked();

    // It survives another reload
    await page.reload();
    await expect(page.getByTestId('canister-choice-active')).toHaveText(
      personalId,
      { timeout: 30_000 }
    );

    // The ICP page still knows the user and their canister
    await page.goto('/en/user/icp');
    await expect(page.getByText('Connected', { exact: true })).toBeVisible();
    await expect(page.getByTestId('personal-canister-mode')).toHaveText(
      'Only you'
    );

    // And back to the shared canister
    await page.goto('/en/user/settings');
    await expect(page.getByTestId('canister-choice-personal')).toBeChecked({
      timeout: 30_000,
    });
    await page.getByTestId('canister-choice-shared').click();
    await expect(page.getByTestId('canister-choice-active')).toHaveText(
      sharedId,
      { timeout: 60_000 }
    );
  }
);

testWithII(
  'a photo uploaded after choosing my own canister is stored there',
  async ({ page, iiPage }) => {
    testWithII.setTimeout(240_000);
    // Every call to a canister carries the canister id in its URL and the
    // method name in its body: record which canister gets what
    const calls: { canister: string; kind: string; method: string }[] = [];
    page.on('request', (r) => {
      const m = r.url().match(/\/canister\/([a-z0-9-]+)\/(call|query)/);
      if (!m) return;
      const body = r.postDataBuffer()?.toString('latin1') ?? '';
      const method =
        body.match(/(uploads_[a-z_]+?|memories_[a-z_]+?)(?=carg|$)/)?.[1] ?? '';
      calls.push({ canister: m[1], kind: m[2], method });
    });

    await page.goto('/en');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await iiPage.signIn({ passkey: { selector: II_BUTTON } });
    await expect(page.getByTestId('user-avatar')).toBeVisible({
      timeout: 20_000,
    });

    await page.goto('/en/user/icp');
    const create = page.getByTestId('personal-canister-create');
    const id = page.getByTestId('personal-canister-id');
    await expect(create.or(id)).toBeVisible({ timeout: 30_000 });
    if (await create.isVisible()) await create.click();
    await expect(id).toHaveText(CANISTER_ID, { timeout: 90_000 });
    const personalId = (await id.textContent())!;

    await page.goto('/en/user/settings');
    await expect(page.getByTestId('canister-choice-shared')).toBeChecked({
      timeout: 30_000,
    });
    const sharedId = (await page
      .getByTestId('canister-choice-active')
      .textContent())!;
    await page.getByTestId('canister-choice-personal').click();
    await expect(page.getByTestId('canister-choice-active')).toHaveText(
      personalId,
      { timeout: 60_000 }
    );

    // Keep memories on ICP. The test identity is the same in every run, so
    // put the account's preferences back afterwards.
    const toIcp = await page.request.patch('/api/me/hosting-preferences', {
      data: {
        backendHosting: 'icp',
        databaseHosting: ['icp'],
        blobHosting: ['icp'],
      },
    });
    expect(toIcp.ok()).toBeTruthy();
    try {
      await page.goto('/en/dashboard');
      const name = `own-canister-${Date.now()}`;
      const png = await page.evaluate((label) => {
        const c = document.createElement('canvas');
        c.width = 320;
        c.height = 240;
        const g = c.getContext('2d')!;
        g.fillStyle = '#c33';
        g.fillRect(0, 0, 320, 240);
        g.fillStyle = '#fff';
        g.font = '20px sans-serif';
        g.fillText(label, 20, 120);
        return c.toDataURL('image/png').split(',')[1];
      }, name);
      const input = page.locator('input[type="file"]').first();
      await expect(input).toBeAttached({ timeout: 30_000 });
      calls.length = 0;
      await input.setInputFiles({
        name: `${name}.png`,
        mimeType: 'image/png',
        buffer: Buffer.from(png, 'base64'),
      });

      // The dashboard lists it, read back from the canister
      await expect(page.getByRole('img', { name })).toBeVisible({
        timeout: 120_000,
      });

      const to = (canister: string, method: RegExp) =>
        calls.filter((c) => c.canister === canister && method.test(c.method));
      expect(to(personalId, /^uploads_begin$/).length).toBeGreaterThan(0);
      expect(to(personalId, /^uploads_finish$/).length).toBeGreaterThan(0);
      expect(to(personalId, /^memories_create/).length).toBeGreaterThan(0);
      // and nothing of it went to the shared canister
      expect(to(sharedId, /^(uploads_|memories_)/)).toEqual([]);

      // The file is served by the personal canister itself. Asked from the
      // browser: the app's image optimizer cannot resolve *.localhost on a
      // local network, so the thumbnail in the card stays empty there.
      const src = await page
        .locator(`img[alt="${name}"]`)
        .first()
        .getAttribute('src');
      const direct = new URL(src!, page.url()).searchParams.get('url') ?? src!;
      expect(direct).toContain(`${personalId}.`);
      const served = await page.evaluate(async (u) => {
        const res = await fetch(u);
        return { status: res.status, size: (await res.blob()).size };
      }, direct);
      expect(served.status).toBe(200);
      expect(served.size).toBeGreaterThan(100);
    } finally {
      await page.request.patch('/api/me/hosting-preferences', {
        data: {
          backendHosting: 'vercel',
          databaseHosting: ['neon'],
          blobHosting: ['s3'],
        },
      });
    }
  }
);
