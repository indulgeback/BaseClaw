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

function buildConversationHostApiMocks() {
  return {
    [stableStringify(['/api/gateway/status', 'GET'])]: hostApiOk({
      state: 'running',
      port: 18789,
      pid: 12345,
      gatewayReady: true,
      connectedAt: Date.now(),
    }),
    [stableStringify(['/api/agents', 'GET'])]: hostApiOk({
      success: true,
      agents: [
        {
          id: 'main',
          name: 'Main Agent',
          isDefault: true,
          modelDisplay: 'GPT-5',
          modelRef: 'openai/gpt-5',
          inheritedModel: false,
          workspace: '/tmp/main',
          agentDir: '/tmp/main/.agent',
          mainSessionKey: 'agent:main:main',
          channelTypes: [],
        },
        {
          id: 'builder',
          name: 'World Builder',
          isDefault: false,
          modelDisplay: 'GPT-5',
          modelRef: 'openai/gpt-5',
          inheritedModel: false,
          workspace: '/tmp/builder',
          agentDir: '/tmp/builder/.agent',
          mainSessionKey: 'agent:builder:main',
          channelTypes: [],
        },
      ],
      defaultAgentId: 'main',
      defaultModelRef: 'openai/gpt-5',
      configuredChannelTypes: [],
      channelOwners: {},
      channelAccountOwners: {},
    }),
  };
}

function buildConversationGatewayRpcMocks() {
  return {
    [stableStringify(['sessions.list', {}])]: {
      success: true,
      result: {
        sessions: [
          {
            key: 'agent:main:main',
            displayName: 'Default planning thread',
            updatedAt: Date.now(),
          },
          {
            key: 'agent:builder:main',
            displayName: 'World Builder home',
            updatedAt: Date.now() - 1_000,
          },
          {
            key: 'agent:builder:castle',
            displayName: 'This is a deliberately long castle building conversation that should overflow the list row width',
            updatedAt: Date.now() - 2_000,
          },
        ],
      },
    },
    [stableStringify(['chat.history', { sessionKey: 'agent:main:main', limit: 200 }])]: {
      success: true,
      result: { messages: [] },
    },
    [stableStringify(['chat.history', { sessionKey: 'agent:builder:main', limit: 200 }])]: {
      success: true,
      result: { messages: [] },
    },
    [stableStringify(['chat.history', { sessionKey: 'agent:builder:castle', limit: 200 }])]: {
      success: true,
      result: { messages: [] },
    },
  };
}

test.describe('ClawX main navigation without setup flow', () => {
  test('navigates between core pages with setup bypassed', async ({ launchElectronApp }) => {
    const app = await launchElectronApp({ skipSetup: true });

    try {
      const page = await getStableWindow(app);

      await expect(page.getByTestId('main-layout')).toBeVisible();

      await page.getByTestId('sidebar-nav-chat').click();
      await expect(page.getByTestId('conversation-list-pane')).toBeVisible();

      await page.getByTestId('sidebar-nav-agents').click();
      await expect(page.getByTestId('agents-page')).toBeVisible();

      await page.getByTestId('sidebar-nav-cron').click();
      await expect(page.getByTestId('cron-page')).toBeVisible();

      await page.getByTestId('sidebar-nav-skills').click();
      await expect(page.getByTestId('skills-page')).toBeVisible();

      await page.getByTestId('sidebar-nav-channels').click();
      await expect(page.getByTestId('channels-page')).toBeVisible();
    } finally {
      await closeElectronApp(app);
    }
  });

  test('renders compact icon-only navigation with active states and tooltips', async ({ launchElectronApp }) => {
    const app = await launchElectronApp({ skipSetup: true });

    try {
      const page = await getStableWindow(app);

      await expect(page.getByTestId('main-layout')).toBeVisible();
      const sidebar = page.getByTestId('sidebar');
      const chatLink = page.getByTestId('sidebar-nav-chat');
      const skillsLink = page.getByTestId('sidebar-nav-skills');
      const agentsLink = page.getByTestId('sidebar-nav-agents');
      const settingsLink = page.getByTestId('sidebar-nav-settings');
      const devConsoleButton = page.getByTestId('sidebar-open-dev-console');

      await expect(sidebar).toHaveClass(/w-\[72px\]/);
      await expect(page.getByTestId('sidebar-new-chat')).toHaveCount(0);
      await expect(chatLink).toHaveText('');
      await expect(skillsLink).toHaveText('');
      await expect(agentsLink).toHaveText('');
      await expect(settingsLink).toHaveText('');
      await expect(devConsoleButton).toHaveText('');
      await expect(chatLink).toHaveAttribute('aria-current', 'page');

      const sidebarLayout = await page.evaluate(() => {
        const sidebarBox = document.querySelector('[data-testid="sidebar"]')?.getBoundingClientRect();
        const chatBox = document.querySelector('[data-testid="sidebar-nav-chat"]')?.getBoundingClientRect();
        const skillsBox = document.querySelector('[data-testid="sidebar-nav-skills"]')?.getBoundingClientRect();

        if (!sidebarBox || !chatBox || !skillsBox) {
          throw new Error('Sidebar controls were not rendered');
        }

        return {
          chatCentered: Math.abs((chatBox.left + chatBox.width / 2) - (sidebarBox.left + sidebarBox.width / 2)) < 2,
          skillsBelowChat: skillsBox.top > chatBox.bottom,
        };
      });

      expect(sidebarLayout.chatCentered).toBe(true);
      expect(sidebarLayout.skillsBelowChat).toBe(true);

      await agentsLink.click();
      await expect(page.getByTestId('agents-page')).toBeVisible();
      await expect(agentsLink).toHaveAttribute('aria-current', 'page');
      await expect(chatLink).not.toHaveAttribute('aria-current', 'page');

      const chatLabel = await chatLink.getAttribute('aria-label');
      await chatLink.hover();
      await expect(page.getByRole('tooltip')).toContainText(chatLabel ?? '');

      await page.keyboard.press('Escape');
      await page.mouse.move(0, 0);
      await expect(page.getByRole('tooltip')).toBeHidden();

      const agentsLabel = await agentsLink.getAttribute('aria-label');
      await agentsLink.hover();
      await expect(page.getByRole('tooltip')).toContainText(agentsLabel ?? '');
    } finally {
      await closeElectronApp(app);
    }
  });

  test('groups conversations by collapsible agent sections and supports search, resize, menu, and tooltips', async ({ launchElectronApp }) => {
    const app = await launchElectronApp({ skipSetup: true });
    const longSessionLabel = 'This is a deliberately long castle building conversation that should overflow the list row width';

    try {
      await installIpcMocks(app, {
        gatewayStatus: { state: 'running', port: 18789, pid: 12345, gatewayReady: true, connectedAt: Date.now() },
        gatewayRpc: buildConversationGatewayRpcMocks(),
        hostApi: buildConversationHostApiMocks(),
      });

      const page = await getStableWindow(app);

      await expect(page.getByTestId('main-layout')).toBeVisible();
      await app.evaluate(({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        win?.webContents.send('gateway:status-changed', {
          state: 'running',
          port: 18789,
          pid: 12345,
          gatewayReady: true,
          connectedAt: Date.now(),
        });
      });

      await expect(page.getByTestId('conversation-list-pane')).toBeVisible();
      await expect(page.getByTestId('conversation-agent-group-main')).toContainText('Main Agent');
      await expect(page.getByTestId('conversation-agent-group-builder')).toContainText('World Builder');
      await expect(page.getByTestId('conversation-agent-group-builder')).toContainText('2');

      const sessionItem = page.getByTestId('conversation-session-agent:builder:castle');
      await expect(sessionItem).toBeVisible();

      const labelIsTruncated = await sessionItem.evaluate((node, expectedLabel) => {
        const spans = Array.from(node.querySelectorAll('span'));
        const label = spans.find((span) => span.textContent === expectedLabel);
        if (!label) return false;
        return label.scrollWidth > label.clientWidth;
      }, longSessionLabel);
      expect(labelIsTruncated).toBe(true);

      await sessionItem.hover();
      const tooltip = page.getByRole('tooltip').filter({ hasText: longSessionLabel });
      await expect(tooltip).toBeVisible();

      const tooltipLayer = await tooltip.evaluate((node) => ({
        zIndex: (() => {
          let current: Element | null = node;
          while (current && current !== document.body) {
            const zIndex = Number(getComputedStyle(current).zIndex);
            if (Number.isFinite(zIndex)) return zIndex;
            current = current.parentElement;
          }
          return Number.NaN;
        })(),
        outsideSidebar: !node.closest('[data-testid="sidebar"]'),
      }));
      expect(tooltipLayer.outsideSidebar).toBe(true);
      expect(Number(tooltipLayer.zIndex)).toBeGreaterThan(50);

      await page.keyboard.press('Escape');
      await page.mouse.move(0, 0);

      await page.getByTestId('conversation-agent-toggle-builder').click();
      await expect(page.getByTestId('conversation-session-agent:builder:castle')).toHaveCount(0);

      await page.getByTestId('conversation-search').fill('castle');
      await expect(page.getByTestId('conversation-session-agent:builder:castle')).toBeVisible();

      await page.getByTestId('conversation-search').fill('');
      await expect(page.getByTestId('conversation-session-agent:builder:castle')).toHaveCount(0);
      await page.getByTestId('conversation-agent-toggle-builder').click();
      await expect(page.getByTestId('conversation-session-agent:builder:castle')).toBeVisible();

      const pane = page.getByTestId('conversation-list-pane');
      const initialWidth = await pane.evaluate((node) => node.getBoundingClientRect().width);
      const resizerBox = await page.getByTestId('conversation-pane-resizer').boundingBox();
      if (!resizerBox) throw new Error('Conversation pane resizer was not rendered');
      await page.mouse.move(resizerBox.x + resizerBox.width / 2, resizerBox.y + resizerBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(resizerBox.x + resizerBox.width / 2 + 260, resizerBox.y + resizerBox.height / 2);
      await page.mouse.up();
      const grownWidth = await pane.evaluate((node) => node.getBoundingClientRect().width);
      expect(grownWidth).toBeGreaterThan(initialWidth);
      expect(grownWidth).toBeLessThanOrEqual(460);

      await page.getByTestId('conversation-create-partner').click();
      await expect(page.getByTestId('conversation-create-menu')).toBeVisible();
      await expect(page.getByTestId('conversation-create-custom')).toBeEnabled();
      await page.getByTestId('conversation-create-custom').click();
      await expect(page.getByTestId('conversation-create-menu')).toHaveCount(0);
      await expect(page.getByTestId('chat-message-0')).toContainText('I want to create a custom AI partner in PokeClaw.');
      await expect(page.locator('[data-testid^="conversation-session-agent:main:session-"]')).toBeVisible();

      await page.getByTestId('conversation-create-partner').click();
      await page.getByTestId('conversation-create-market').click();
      await expect(page.getByTestId('agents-page')).toBeVisible();
      await expect(page.getByTestId('agents-market')).toBeVisible();
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
      await page.getByTestId('agents-scene-manage').click();
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
      await page.getByTestId('agents-scene-manage').click();
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
      await page.getByTestId('skills-scene-manage').click();
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
