import { closeElectronApp, expect, getStableWindow, test } from './fixtures/electron';

test.describe('Settings theme switching', () => {
  test('switches the app root between light, dark, and system themes from settings', async ({ launchElectronApp }) => {
    const app = await launchElectronApp({ skipSetup: true });

    try {
      const page = await getStableWindow(app);

      await expect(page.getByTestId('main-layout')).toBeVisible();
      await page.getByTestId('sidebar-nav-settings').click();
      await expect(page.getByTestId('settings-page')).toBeVisible();
      await expect(page.getByTestId('settings-page-title')).toBeVisible();

      await page.getByTestId('settings-theme-dark').click();
      await expect.poll(async () => {
        return await page.evaluate(() => document.documentElement.className);
      }).toContain('dark');

      await page.getByTestId('settings-theme-light').click();
      await expect.poll(async () => {
        return await page.evaluate(() => document.documentElement.className);
      }).toContain('light');

      await page.getByTestId('settings-theme-system').click();
      await expect.poll(async () => {
        return await page.evaluate(() => document.documentElement.className);
      }).toMatch(/light|dark/);
    } finally {
      await closeElectronApp(app);
    }
  });
});
