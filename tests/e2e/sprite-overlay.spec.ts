import { completeSetup, expect, test } from './fixtures/electron';

test.describe('SpriteClaw overlay sprite', () => {
  test.skip(process.platform === 'linux', 'Overlay sprite is intentionally deferred on Linux in v1.');

  test('opens the overlay from settings and syncs state from the main window', async ({ electronApp, page }) => {
    await completeSetup(page);

    await page.getByTestId('sidebar-nav-settings').click();
    await expect(page.getByTestId('settings-page')).toBeVisible();
    await page.getByTestId('settings-sprite-show-button').click();

    const overlayPage = await electronApp.waitForEvent('window');
    await overlayPage.waitForLoadState('domcontentloaded');
    await expect(overlayPage.getByTestId('sprite-stage-compact')).toBeVisible();
  });
});
