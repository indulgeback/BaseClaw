import { closeElectronApp, completeSetup, expect, getStableWindow, installIpcMocks, test } from './fixtures/electron';

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`);
  return `{${entries.join(',')}}`;
}

function hostApiOk(json: unknown) {
  return {
    ok: true,
    data: {
      status: 200,
      ok: true,
      json,
    },
  };
}

const installedSkill = {
  id: 'docsync',
  slug: 'docsync',
  name: 'docsync',
  description: 'Auto-generate docs from code and detect documentation drift via git hooks.',
  disabled: false,
  version: '1.0.0',
  bundled: false,
  source: 'clawx-market-preset',
  baseDir: '/tmp/pdf',
  config: {},
};

test.describe('Skills market', () => {
  test('shows the built-in market, category navigation, and manage flow with ClawHub fallback', async ({ launchElectronApp }) => {
    const app = await launchElectronApp();

    try {
      const page = await getStableWindow(app);

      await app.evaluate(async () => {
        const { ipcMain } = process.mainModule!.require('electron') as typeof import('electron');
        ipcMain.removeHandler('skill:updateConfig');
        ipcMain.handle('skill:updateConfig', async () => ({ success: true }));
        ipcMain.removeHandler('openclaw:getSkillsDir');
        ipcMain.handle('openclaw:getSkillsDir', async () => '/tmp/skills');
      });

      await installIpcMocks(app, {
        gatewayStatus: { state: 'running', port: 18789 },
        gatewayRpc: {
          [stableStringify(['skills.status', null])]: { skills: [installedSkill] },
        },
        hostApi: {
          [stableStringify(['/api/skills/configs', 'GET'])]: hostApiOk({}),
          [stableStringify(['/api/clawhub/list', 'GET'])]: hostApiOk({
            success: true,
            results: [{ slug: 'docsync', version: '1.0.0', source: 'clawx-market-preset', baseDir: '/tmp/docsync' }],
          }),
          [stableStringify(['/api/skills/presets/install', 'POST'])]: hostApiOk({ success: true }),
          [stableStringify(['/api/clawhub/search', 'POST'])]: hostApiOk({ success: true, results: [] }),
        },
      });

      await completeSetup(page);
      await page.getByTestId('sidebar-nav-skills').click();

      await expect(page.getByTestId('skills-market')).toBeVisible();
      await expect(page.getByTestId('skills-category-search-and-research')).toHaveCSS('white-space', 'nowrap');
      await expect(page.getByTestId('skills-category-search-and-research')).toHaveCSS('flex-shrink', '0');
      await expect(page.getByTestId('skills-categories-scroll-left')).toBeVisible();
      await expect(page.getByTestId('skills-categories-scroll-right')).toBeVisible();
      await expect(page.getByTestId('skills-categories-scroll-right')).toBeEnabled();
      await page.getByTestId('skills-category-search-and-research').click();
      await expect(page.getByTestId('skills-market-section-search-and-research')).toBeVisible();
      await page.getByTestId('skills-category-pdf-and-documents').click();
      await expect(page.getByTestId('skills-market-section-pdf-and-documents')).toBeVisible();
      await page.getByTestId('skills-scene-manage').click();
      await expect(page.getByTestId('skills-manage')).toBeVisible();
      await expect(page.getByTestId('skills-manage-actions-row')).toBeVisible();
      await expect(page.getByTestId('skills-manage-category-row')).toBeVisible();
      const actionsRowBox = await page.getByTestId('skills-manage-actions-row').boundingBox();
      const categoryRowBox = await page.getByTestId('skills-manage-category-row').boundingBox();
      expect(actionsRowBox).not.toBeNull();
      expect(categoryRowBox).not.toBeNull();
      expect(categoryRowBox!.y).toBeGreaterThan(actionsRowBox!.y);
      await expect(page.getByRole('button', { name: /Enable Visible|批量启用可见项|表示中を一括有効化/ })).toBeVisible();
      await expect(page.getByTestId('skills-open-install-drawer')).toBeVisible();

      await page.getByTestId('skills-open-install-drawer').click();
      await expect(page.getByTestId('skills-install-drawer')).toBeVisible();
    } finally {
      await closeElectronApp(app);
    }
  });
});
