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

const importedAgent = {
  id: 'frontend-developer',
  templateId: 'frontend-developer',
  name: 'Frontend Developer',
  isDefault: false,
  modelDisplay: 'GPT-5',
  modelRef: 'openai/gpt-5',
  overrideModelRef: null,
  inheritedModel: true,
  workspace: '/tmp/frontend-developer',
  agentDir: '/tmp/frontend-developer/.agent',
  mainSessionKey: 'agent:frontend-developer:main',
  channelTypes: [],
  sourceRepo: 'msitarzewski/agency-agents',
  sourceCommit: '783f6a72bfd7f3135700ac273c619d92821b419a',
  sourcePath: 'engineering/engineering-frontend-developer.md',
  categoryId: 'engineering',
};

test.describe('Agents market', () => {
  test('imports an Agency template, edits files, and opens chat for that agent', async ({ launchElectronApp }) => {
    const app = await launchElectronApp();

    try {
      const page = await getStableWindow(app);

      await installIpcMocks(app, {
        hostApi: {
          [stableStringify(['/api/agents', 'GET'])]: hostApiOk({
            agents: [],
            defaultAgentId: 'main',
            defaultModelRef: 'openai/gpt-5',
            configuredChannelTypes: [],
            channelOwners: {},
            channelAccountOwners: {},
          }),
          [stableStringify(['/api/agents', 'POST'])]: hostApiOk({
            agents: [importedAgent],
            defaultAgentId: 'main',
            defaultModelRef: 'openai/gpt-5',
            configuredChannelTypes: [],
            channelOwners: {},
            channelAccountOwners: {},
          }),
          [stableStringify(['/api/agents/frontend-developer/files/AGENTS.md', 'GET'])]: hostApiOk({
            success: true,
            content: '## Mission\nBuild excellent frontends.',
          }),
          [stableStringify(['/api/agents/frontend-developer/files/AGENTS.md', 'PUT'])]: hostApiOk({
            success: true,
            content: '## Mission\nBuild excellent frontends.\n\nSaved in E2E.',
          }),
          [stableStringify(['/api/channels/accounts', 'GET'])]: hostApiOk({ channels: [] }),
          [stableStringify(['/api/provider-accounts', 'GET'])]: hostApiOk([]),
          [stableStringify(['/api/providers', 'GET'])]: hostApiOk([]),
          [stableStringify(['/api/provider-vendors', 'GET'])]: hostApiOk([]),
          [stableStringify(['/api/provider-accounts/default', 'GET'])]: hostApiOk({ accountId: null }),
          [stableStringify(['/api/sessions', 'GET'])]: hostApiOk({ sessions: [] }),
          [stableStringify(['/api/sessions/history?session=agent%3Afrontend-developer%3Amain&limit=200', 'GET'])]: hostApiOk({ messages: [] }),
        },
      });

      await completeSetup(page);
      await page.getByTestId('sidebar-nav-agents').click();
      await expect(page.getByTestId('agents-page')).toBeVisible();
      await expect(page.getByTestId('agents-market')).toBeVisible();

      await page.getByTestId('agents-category-engineering').click();
      await expect(page.getByTestId('agents-market-section-engineering')).toBeVisible();
      await page.getByTestId('agents-category-design').click();
      await expect(page.getByTestId('agents-market-section-design')).toBeVisible();
      await page.getByTestId('agents-category-engineering').click();
      await expect(page.getByTestId('agents-market-section-engineering')).toBeVisible();

      await page.getByTestId('agent-template-add-frontend-developer').click();
      await expect(page.getByTestId('agent-template-chat-frontend-developer')).toBeVisible();
      await installIpcMocks(app, {
        hostApi: {
          [stableStringify(['/api/agents', 'GET'])]: hostApiOk({
            agents: [importedAgent],
            defaultAgentId: 'main',
            defaultModelRef: 'openai/gpt-5',
            configuredChannelTypes: [],
            channelOwners: {},
            channelAccountOwners: {},
          }),
          [stableStringify(['/api/agents', 'POST'])]: hostApiOk({
            agents: [importedAgent],
            defaultAgentId: 'main',
            defaultModelRef: 'openai/gpt-5',
            configuredChannelTypes: [],
            channelOwners: {},
            channelAccountOwners: {},
          }),
          [stableStringify(['/api/agents/frontend-developer/files/AGENTS.md', 'GET'])]: hostApiOk({
            success: true,
            content: '## Mission\nBuild excellent frontends.',
          }),
          [stableStringify(['/api/agents/frontend-developer/files/AGENTS.md', 'PUT'])]: hostApiOk({
            success: true,
            content: '## Mission\nBuild excellent frontends.\n\nSaved in E2E.',
          }),
          [stableStringify(['/api/channels/accounts', 'GET'])]: hostApiOk({ channels: [] }),
          [stableStringify(['/api/provider-accounts', 'GET'])]: hostApiOk([]),
          [stableStringify(['/api/providers', 'GET'])]: hostApiOk([]),
          [stableStringify(['/api/provider-vendors', 'GET'])]: hostApiOk([]),
          [stableStringify(['/api/provider-accounts/default', 'GET'])]: hostApiOk({ accountId: null }),
          [stableStringify(['/api/sessions', 'GET'])]: hostApiOk({ sessions: [] }),
          [stableStringify(['/api/sessions/history?session=agent%3Afrontend-developer%3Amain&limit=200', 'GET'])]: hostApiOk({ messages: [] }),
        },
      });

      await page.getByTestId('agents-scene-manage').click();
      await expect(page.getByTestId('agent-card-frontend-developer')).toContainText('Frontend Developer');

      await page.getByTestId('agent-files-frontend-developer').click();
      await expect(page.getByTestId('agent-files-drawer')).toBeVisible();
      await page.getByTestId('agent-file-editor').fill('## Mission\nBuild excellent frontends.\n\nSaved in E2E.');
      await page.getByTestId('agent-file-save').click();
      await page.getByTestId('agent-files-close').click();
      await expect(page.getByTestId('agent-files-drawer')).toHaveCount(0);

      await page.getByTestId('agent-chat-frontend-developer').click();
      await expect(page.getByTestId('agents-page')).toHaveCount(0);
      await expect(page.getByText(/Frontend Developer/).last()).toBeVisible();
    } finally {
      await closeElectronApp(app);
    }
  });
});
