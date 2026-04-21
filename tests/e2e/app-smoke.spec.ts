import { closeElectronApp, expect, test } from './fixtures/electron';

test.describe('ClawX Electron smoke flows', () => {
  test('shows the setup wizard on a fresh profile', async ({ page }) => {
    await expect(page.getByTestId('setup-page')).toBeVisible();
    await expect(page.getByTestId('setup-welcome-step')).toBeVisible();
    await expect(page.getByTestId('setup-skip-button')).toBeVisible();
  });

  test('uses the PokeClaw shell brand for app and window titles', async ({ electronApp, page }) => {
    await expect(page.getByTestId('setup-page')).toBeVisible();

    const shellBrand = await electronApp.evaluate(({ BrowserWindow, Menu, app }) => {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      return {
        appName: app.getName(),
        menuLabel: process.platform === 'darwin'
          ? Menu.getApplicationMenu()?.items[0]?.label ?? null
          : null,
        windowTitle: mainWindow?.getTitle() ?? null,
      };
    });

    expect(shellBrand.appName).toBe('PokeClaw');
    expect(shellBrand.windowTitle).toBe('PokeClaw');
    if (process.platform === 'darwin') {
      expect(shellBrand.menuLabel).toBe('PokeClaw');
    }
  });

  test('can skip setup and navigate to the models page', async ({ page }) => {
    await expect(page.getByTestId('setup-page')).toBeVisible();
    await page.getByTestId('setup-skip-button').click();

    await expect(page.getByTestId('main-layout')).toBeVisible();
    await page.getByTestId('sidebar-nav-models').click();

    await expect(page.getByTestId('models-page')).toBeVisible();
    await expect(page.getByTestId('models-page-title')).toBeVisible();
    await expect(page.getByTestId('providers-settings')).toBeVisible();
  });

  test('persists skipped setup across relaunch for the same isolated profile', async ({ electronApp, launchElectronApp }) => {
    const firstWindow = await electronApp.firstWindow();
    await firstWindow.waitForLoadState('domcontentloaded');
    await firstWindow.getByTestId('setup-skip-button').click();
    await expect(firstWindow.getByTestId('main-layout')).toBeVisible();

    await closeElectronApp(electronApp);

    const relaunchedApp = await launchElectronApp();
    try {
      const relaunchedWindow = await relaunchedApp.firstWindow();
      await relaunchedWindow.waitForLoadState('domcontentloaded');

      await expect(relaunchedWindow.getByTestId('main-layout')).toBeVisible();
      await expect(relaunchedWindow.getByTestId('setup-page')).toHaveCount(0);
    } finally {
      await closeElectronApp(relaunchedApp);
    }
  });
});
