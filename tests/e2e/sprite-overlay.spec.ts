import { completeSetup, expect, installIpcMocks, test } from './fixtures/electron';

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`);
  return `{${entries.join(',')}}`;
}

async function mockRunningGateway(electronApp: Parameters<typeof installIpcMocks>[0], page: Parameters<typeof completeSetup>[0]) {
  await installIpcMocks(electronApp, {
    gatewayStatus: { state: 'running', port: 18789, pid: 12345 },
    hostApi: {
      [stableStringify(['/api/gateway/status', 'GET'])]: {
        ok: true,
        data: {
          status: 200,
          ok: true,
          json: { state: 'running', port: 18789, pid: 12345 },
        },
      },
    },
  });

  await page.reload();
  await completeSetup(page);
}

test.describe('SpriteClaw overlay sprite', () => {
  test.skip(process.platform === 'linux', 'Overlay sprite is intentionally deferred on Linux in v1.');

  test('opens the overlay from settings and syncs state from the main window', async ({ electronApp, page }) => {
    await mockRunningGateway(electronApp, page);

    const composer = page.getByRole('textbox').first();
    await composer.click();
    await composer.fill('draft for sprite overlay sync');

    await page.getByTestId('sidebar-nav-settings').click();
    await expect(page.getByTestId('settings-page')).toBeVisible();
    const overlaySwitch = page.getByTestId('settings-sprite-overlay-switch');
    await overlaySwitch.click();
    await overlaySwitch.click();

    const overlayPage = await electronApp.waitForEvent('window');
    await overlayPage.waitForLoadState('domcontentloaded');
    const overlayStage = overlayPage.getByTestId('sprite-stage-compact');
    await expect(overlayStage).toHaveAttribute('data-sprite-requested-state', 'listen');
    await expect(page.getByTestId('settings-sprite-locked-switch')).toBeVisible();
  });

  test('routes window hide and restore through sleep request back to idle', async ({ electronApp, page }) => {
    await mockRunningGateway(electronApp, page);

    await page.getByTestId('sidebar-nav-settings').click();
    await expect(page.getByTestId('settings-page')).toBeVisible();
    const overlaySwitch = page.getByTestId('settings-sprite-overlay-switch');
    await overlaySwitch.click();
    await overlaySwitch.click();

    const overlayPage = await electronApp.waitForEvent('window');
    await overlayPage.waitForLoadState('domcontentloaded');
    const overlayStage = overlayPage.getByTestId('sprite-stage-compact');

    await page.getByTestId('sidebar-new-chat').click();
    await expect(page.getByTestId('main-layout')).toBeVisible();
    await page.getByRole('textbox').first().blur();
    await expect(overlayStage).toHaveAttribute('data-sprite-requested-state', 'idle');

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      window.dispatchEvent(new Event('blur'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(overlayStage).toHaveAttribute('data-sprite-requested-state', 'sleep');

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.getByRole('textbox').first().blur();
    await expect(overlayStage).toHaveAttribute('data-sprite-requested-state', 'idle');
  });

  test('requires re-enabling the floating sprite in settings after it is turned off', async ({ page }) => {
    await completeSetup(page);
    await page.getByTestId('sidebar-nav-settings').click();
    await expect(page.getByTestId('settings-page')).toBeVisible();

    const overlaySwitch = page.getByTestId('settings-sprite-overlay-switch');
    const lockSwitch = page.getByTestId('settings-sprite-locked-switch');

    await expect(overlaySwitch).toBeVisible();
    await expect(lockSwitch).toBeVisible();

    await overlaySwitch.click();
    await expect(overlaySwitch).toHaveAttribute('data-state', 'unchecked');

    await overlaySwitch.click();
    await expect(overlaySwitch).toHaveAttribute('data-state', 'checked');

    await lockSwitch.click();
    await expect(lockSwitch).toHaveAttribute('data-state', 'checked');
  });
});
