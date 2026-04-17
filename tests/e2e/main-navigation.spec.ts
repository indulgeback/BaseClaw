import { closeElectronApp, expect, getStableWindow, test } from './fixtures/electron';

test.describe('ClawX main navigation without setup flow', () => {
  test('navigates between core pages with setup bypassed', async ({ launchElectronApp }) => {
    const app = await launchElectronApp({ skipSetup: true });

    try {
      const page = await getStableWindow(app);

      await expect(page.getByTestId('main-layout')).toBeVisible();

      await page.getByTestId('sidebar-nav-models').click();
      await expect(page.getByTestId('models-page')).toBeVisible();
      await expect(page.getByTestId('models-page-title')).toBeVisible();

      await page.getByTestId('sidebar-nav-agents').click();
      await expect(page.getByTestId('agents-page')).toBeVisible();

      await page.getByTestId('sidebar-nav-channels').click();
      await expect(page.getByTestId('channels-page')).toBeVisible();
    } finally {
      await closeElectronApp(app);
    }
  });

  test('collapses and restores the redesigned sidebar navigation', async ({ launchElectronApp }) => {
    const app = await launchElectronApp({ skipSetup: true });

    try {
      const page = await getStableWindow(app);

      await expect(page.getByTestId('main-layout')).toBeVisible();
      const sidebar = page.getByTestId('sidebar');
      const toggle = page.getByRole('button', { name: 'Collapse sidebar' });
      const newChatButton = page.getByTestId('sidebar-new-chat');

      await expect(sidebar).toHaveClass(/w-\[268px\]/);
      await expect(newChatButton).not.toHaveText('');

      await toggle.click();
      await expect(sidebar).toHaveClass(/w-\[68px\]/);
      await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
      await expect(newChatButton).toHaveText('');

      await page.getByRole('button', { name: 'Expand sidebar' }).click();
      await expect(sidebar).toHaveClass(/w-\[268px\]/);
      await page.getByTestId('sidebar-nav-models').click();
      await expect(page.getByTestId('models-page')).toBeVisible();
    } finally {
      await closeElectronApp(app);
    }
  });
});
