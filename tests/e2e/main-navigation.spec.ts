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

function buildAgentsPageHostApiMocks(agent: { id: string; name: string; overrideModelRef?: string | null }) {
  return {
    [stableStringify(['/api/agents', 'GET'])]: hostApiOk({
      agents: [
        {
          id: agent.id,
          name: agent.name,
          isDefault: false,
          modelDisplay: 'GPT-5',
          modelRef: 'openai/gpt-5',
          overrideModelRef: agent.overrideModelRef ?? 'openai/gpt-5',
          inheritedModel: false,
          workspace: `/tmp/${agent.id}`,
          agentDir: `/tmp/${agent.id}/.agent`,
          mainSessionKey: `${agent.id}-session`,
          channelTypes: [],
        },
      ],
      defaultAgentId: 'main',
      defaultModelRef: 'openai/gpt-5',
      configuredChannelTypes: [],
      channelOwners: {},
      channelAccountOwners: {},
    }),
    [stableStringify(['/api/channels/accounts', 'GET'])]: hostApiOk({ channels: [] }),
    [stableStringify(['/api/provider-accounts', 'GET'])]: hostApiOk([]),
    [stableStringify(['/api/providers', 'GET'])]: hostApiOk([]),
    [stableStringify(['/api/provider-vendors', 'GET'])]: hostApiOk([]),
    [stableStringify(['/api/provider-accounts/default', 'GET'])]: hostApiOk({ accountId: null }),
  };
}

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

  test('renders the shared confirm dialog above page-level stacking contexts', async ({ launchElectronApp }) => {
    const app = await launchElectronApp();

    try {
      const page = await getStableWindow(app);
      const agentId = 'portal-agent';
      const agentName = 'Portal Layering Agent';

      await installIpcMocks(app, {
        hostApi: buildAgentsPageHostApiMocks({ id: agentId, name: agentName }),
      });

      await completeSetup(page);
      await page.getByTestId('sidebar-nav-agents').click();
      await expect(page.getByTestId('agents-page')).toBeVisible();
      await expect(page.getByTestId(`agent-card-${agentId}`)).toContainText(agentName);

      const agentCard = page.getByTestId(`agent-card-${agentId}`);
      await agentCard.hover();
      await page.getByTestId(`agent-delete-${agentId}`).click();

      await expect(page.getByTestId('confirm-dialog-content')).toBeVisible();

      const renderedAtTopLevel = await page.getByTestId('confirm-dialog-overlay').evaluate((node) => {
        const overlay = node as HTMLElement;
        return overlay.parentElement === document.body && !overlay.closest('[data-testid="agents-page"]');
      });

      expect(renderedAtTopLevel).toBe(true);
    } finally {
      await closeElectronApp(app);
    }
  });

  test('keeps agent dialogs on the shared themed surface', async ({ launchElectronApp }) => {
    const app = await launchElectronApp();

    try {
      const page = await getStableWindow(app);
      const agentId = 'theme-agent';
      const agentName = 'Theme Surface Agent';

      await installIpcMocks(app, {
        hostApi: buildAgentsPageHostApiMocks({ id: agentId, name: agentName }),
      });

      await completeSetup(page);
      await page.getByTestId('sidebar-nav-agents').click();
      await expect(page.getByTestId('agents-page')).toBeVisible();
      await expect(page.getByTestId(`agent-card-${agentId}`)).toContainText(agentName);

      await page.getByTestId('agents-add-agent').click();
      await expect(page.getByTestId('add-agent-dialog-content')).toBeVisible();
      const addDialogBackground = await page.getByTestId('add-agent-dialog-content').evaluate((node) => (
        getComputedStyle(node as HTMLElement).backgroundColor
      ));
      await page.getByTestId('add-agent-dialog-cancel').click();
      await expect(page.getByTestId('add-agent-dialog-content')).toHaveCount(0);

      const agentCard = page.getByTestId(`agent-card-${agentId}`);
      await agentCard.hover();
      await page.getByTestId(`agent-settings-${agentId}`).click();
      await expect(page.getByTestId('agent-settings-modal-content')).toBeVisible();

      const settingsDialogBackground = await page.getByTestId('agent-settings-modal-content').evaluate((node) => (
        getComputedStyle(node as HTMLElement).backgroundColor
      ));
      expect(settingsDialogBackground).toBe(addDialogBackground);

      await page.getByTestId('agent-model-open').click();
      await expect(page.getByTestId('agent-model-modal-content')).toBeVisible();

      const modelDialogBackground = await page.getByTestId('agent-model-modal-content').evaluate((node) => (
        getComputedStyle(node as HTMLElement).backgroundColor
      ));
      expect(modelDialogBackground).toBe(addDialogBackground);
    } finally {
      await closeElectronApp(app);
    }
  });

  test('uses the current theme surface for skills drawers', async ({ launchElectronApp }) => {
    const app = await launchElectronApp({ skipSetup: true });

    try {
      const page = await getStableWindow(app);

      await expect(page.getByTestId('main-layout')).toBeVisible();
      await page.getByTestId('sidebar-nav-skills').click();
      await page.getByTestId('skills-open-install-drawer').click();

      const drawer = page.getByTestId('skills-install-drawer');
      await expect(drawer).toBeVisible();

      const drawerBackground = await drawer.evaluate((node) => (
        getComputedStyle(node as HTMLElement).backgroundColor
      ));

      expect(drawerBackground).toBe('rgb(255, 255, 255)');
    } finally {
      await closeElectronApp(app);
    }
  });
});
