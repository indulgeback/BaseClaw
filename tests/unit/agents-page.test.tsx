import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Agents } from '../../src/pages/Agents/index';

const hostApiFetchMock = vi.fn();
const subscribeHostEventMock = vi.fn();
const fetchAgentsMock = vi.fn();
const updateAgentMock = vi.fn();
const updateAgentModelMock = vi.fn();
const createAgentFromTemplateMock = vi.fn();
const refreshProviderSnapshotMock = vi.fn();
const switchSessionMock = vi.fn();
const navigateMock = vi.fn();

const { gatewayState, agentsState, providersState, marketCatalog, templateDetail, loadAgentTemplateDetailMock, tMock } = vi.hoisted(() => ({
  gatewayState: {
    status: { state: 'running', port: 18789 },
  },
  agentsState: {
    agents: [] as Array<Record<string, unknown>>,
    defaultModelRef: null as string | null,
    loading: false,
    error: null as string | null,
  },
  providersState: {
    accounts: [] as Array<Record<string, unknown>>,
    statuses: [] as Array<Record<string, unknown>>,
    vendors: [] as Array<Record<string, unknown>>,
    defaultAccountId: '' as string,
  },
  marketCatalog: {
    sourceRepo: 'msitarzewski/agency-agents',
    sourceCommit: '783f6a72bfd7f3135700ac273c619d92821b419a',
    sourceCommitShort: '783f6a7',
    generatedAt: '2026-04-23T00:00:00.000Z',
    categories: [
      { id: 'engineering', name: 'Engineering', count: 1 },
      { id: 'design', name: 'Design', count: 1 },
    ],
    templates: [
      {
        id: 'frontend-developer',
        templateId: 'frontend-developer',
        name: 'Frontend Developer',
        description: 'Builds polished web interfaces.',
        categoryId: 'engineering',
        category: 'Engineering',
        version: '783f6a7',
        badge: 'Imported',
        status: 'stable',
        tags: ['frontend', 'ui', 'react'],
        modelRef: null,
        previewFiles: [],
        sourceRepo: 'msitarzewski/agency-agents',
        sourceCommit: '783f6a72bfd7f3135700ac273c619d92821b419a',
        sourcePath: 'engineering/engineering-frontend-developer.md',
      },
      {
        id: 'ui-designer',
        templateId: 'ui-designer',
        name: 'UI Designer',
        description: 'Shapes product interfaces.',
        categoryId: 'design',
        category: 'Design',
        version: '783f6a7',
        badge: 'Imported',
        status: 'stable',
        tags: ['design', 'product'],
        modelRef: null,
        previewFiles: [],
        sourceRepo: 'msitarzewski/agency-agents',
        sourceCommit: '783f6a72bfd7f3135700ac273c619d92821b419a',
        sourcePath: 'design/design-ui-designer.md',
      },
    ],
  },
  templateDetail: {
    id: 'frontend-developer',
    templateId: 'frontend-developer',
    name: 'Frontend Developer',
    description: 'Builds polished web interfaces.',
    categoryId: 'engineering',
    category: 'Engineering',
    version: '783f6a7',
    badge: 'Imported',
    status: 'stable',
    tags: [],
    modelRef: null,
    previewFiles: [],
    sourceRepo: 'msitarzewski/agency-agents',
    sourceCommit: '783f6a72bfd7f3135700ac273c619d92821b419a',
    sourcePath: 'engineering/engineering-frontend-developer.md',
    files: {
      'SOUL.md': '## Identity\nFrontend soul',
      'AGENTS.md': '## Mission\nFrontend work',
      'IDENTITY.md': '# Frontend Developer\nBuilds polished web interfaces.',
    },
  },
  loadAgentTemplateDetailMock: vi.fn(),
  tMock: vi.fn((key: string) => key),
}));

vi.mock('@/stores/gateway', () => ({
  useGatewayStore: (selector: (state: typeof gatewayState) => unknown) => selector(gatewayState),
}));

vi.mock('@/stores/agents', () => ({
  useAgentsStore: (selector?: (state: typeof agentsState & {
    fetchAgents: typeof fetchAgentsMock;
    updateAgent: typeof updateAgentMock;
    updateAgentModel: typeof updateAgentModelMock;
    createAgentFromTemplate: typeof createAgentFromTemplateMock;
    createAgent: ReturnType<typeof vi.fn>;
    deleteAgent: ReturnType<typeof vi.fn>;
  }) => unknown) => {
    const state = {
      ...agentsState,
      fetchAgents: fetchAgentsMock,
      updateAgent: updateAgentMock,
      updateAgentModel: updateAgentModelMock,
      createAgentFromTemplate: createAgentFromTemplateMock,
      createAgent: vi.fn(),
      deleteAgent: vi.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

vi.mock('@/stores/chat', () => ({
  useChatStore: (selector: (state: { switchSession: typeof switchSessionMock }) => unknown) => selector({
    switchSession: switchSessionMock,
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/stores/providers', () => ({
  useProviderStore: (selector: (state: typeof providersState & {
    refreshProviderSnapshot: typeof refreshProviderSnapshotMock;
  }) => unknown) => {
    const state = {
      ...providersState,
      refreshProviderSnapshot: refreshProviderSnapshotMock,
    };
    return selector(state);
  },
}));

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: (...args: unknown[]) => hostApiFetchMock(...args),
}));

vi.mock('@/lib/host-events', () => ({
  subscribeHostEvent: (...args: unknown[]) => subscribeHostEventMock(...args),
}));

vi.mock('@/lib/agent-market', () => ({
  getAgentMarketCatalog: () => marketCatalog,
  loadAgentTemplateDetail: (...args: unknown[]) => loadAgentTemplateDetailMock(...args),
}));

vi.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  useTranslation: () => ({
    t: tMock,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('Agents page status refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gatewayState.status = { state: 'running', port: 18789 };
    agentsState.agents = [];
    agentsState.defaultModelRef = null;
    providersState.accounts = [];
    providersState.statuses = [];
    providersState.vendors = [];
    providersState.defaultAccountId = '';
    fetchAgentsMock.mockResolvedValue(undefined);
    updateAgentMock.mockResolvedValue(undefined);
    updateAgentModelMock.mockResolvedValue(undefined);
    createAgentFromTemplateMock.mockResolvedValue(undefined);
    loadAgentTemplateDetailMock.mockResolvedValue(templateDetail);
    refreshProviderSnapshotMock.mockResolvedValue(undefined);
    hostApiFetchMock.mockResolvedValue({
      success: true,
      channels: [],
    });
  });

  it('refetches channel accounts when gateway channel-status events arrive', async () => {
    let channelStatusHandler: (() => void) | undefined;
    subscribeHostEventMock.mockImplementation((eventName: string, handler: () => void) => {
      if (eventName === 'gateway:channel-status') {
        channelStatusHandler = handler;
      }
      return vi.fn();
    });

    render(<Agents />);

    await waitFor(() => {
      expect(fetchAgentsMock).toHaveBeenCalledTimes(1);
      expect(hostApiFetchMock).toHaveBeenCalledWith('/api/channels/accounts');
    });
    expect(subscribeHostEventMock).toHaveBeenCalledWith('gateway:channel-status', expect.any(Function));

    await act(async () => {
      channelStatusHandler?.();
    });

    await waitFor(() => {
      const channelFetchCalls = hostApiFetchMock.mock.calls.filter(([path]) => path === '/api/channels/accounts');
      expect(channelFetchCalls).toHaveLength(2);
    });
  });

  it('refetches channel accounts when the gateway transitions to running after mount', async () => {
    gatewayState.status = { state: 'starting', port: 18789 };

    const { rerender } = render(<Agents />);

    await waitFor(() => {
      expect(fetchAgentsMock).toHaveBeenCalledTimes(1);
      expect(hostApiFetchMock).toHaveBeenCalledWith('/api/channels/accounts');
    });

    gatewayState.status = { state: 'running', port: 18789 };
    await act(async () => {
      rerender(<Agents />);
    });

    await waitFor(() => {
      const channelFetchCalls = hostApiFetchMock.mock.calls.filter(([path]) => path === '/api/channels/accounts');
      expect(channelFetchCalls).toHaveLength(2);
    });
  });

  it('uses "Use default model" as form fill only and disables it when already default', async () => {
    agentsState.agents = [
      {
        id: 'main',
        name: 'Main',
        isDefault: true,
        modelDisplay: 'claude-opus-4.6',
        modelRef: 'openrouter/anthropic/claude-opus-4.6',
        overrideModelRef: null,
        inheritedModel: true,
        workspace: '~/.openclaw/workspace',
        agentDir: '~/.openclaw/agents/main/agent',
        mainSessionKey: 'agent:main:desk',
        channelTypes: [],
      },
    ];
    agentsState.defaultModelRef = 'openrouter/anthropic/claude-opus-4.6';
    providersState.accounts = [
      {
        id: 'openrouter-default',
        label: 'OpenRouter',
        vendorId: 'openrouter',
        authMode: 'api_key',
        model: 'openrouter/anthropic/claude-opus-4.6',
        enabled: true,
        createdAt: '2026-03-24T00:00:00.000Z',
        updatedAt: '2026-03-24T00:00:00.000Z',
      },
    ];
    providersState.statuses = [{ id: 'openrouter-default', hasKey: true }];
    providersState.vendors = [
      { id: 'openrouter', name: 'OpenRouter', modelIdPlaceholder: 'anthropic/claude-opus-4.6' },
    ];
    providersState.defaultAccountId = 'openrouter-default';

    render(<Agents />);

    await waitFor(() => {
      expect(fetchAgentsMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTestId('agents-scene-manage'));
    fireEvent.click(screen.getByTitle('settings'));
    fireEvent.click(screen.getByText('settingsDialog.modelLabel').closest('button') as HTMLButtonElement);

    const useDefaultButton = await screen.findByRole('button', { name: 'settingsDialog.useDefaultModel' });
    const modelIdInput = screen.getByLabelText('settingsDialog.modelIdLabel');
    const saveButton = screen.getByRole('button', { name: 'common:actions.save' });

    expect(useDefaultButton).toBeDisabled();

    fireEvent.change(modelIdInput, { target: { value: 'anthropic/claude-sonnet-4.5' } });
    expect(useDefaultButton).toBeEnabled();
    expect(saveButton).toBeEnabled();

    fireEvent.click(useDefaultButton);

    expect(updateAgentModelMock).not.toHaveBeenCalled();
    expect((modelIdInput as HTMLInputElement).value).toBe('anthropic/claude-opus-4.6');
    expect(useDefaultButton).toBeDisabled();
  });

  it('keeps the last agent snapshot visible while a refresh is in flight', async () => {
    agentsState.agents = [
      {
        id: 'main',
        name: 'Main',
        isDefault: true,
        modelDisplay: 'gpt-5',
        modelRef: 'openai/gpt-5',
        overrideModelRef: null,
        inheritedModel: true,
        workspace: '~/.openclaw/workspace',
        agentDir: '~/.openclaw/agents/main/agent',
        mainSessionKey: 'agent:main:main',
        channelTypes: [],
      },
    ];

    const { rerender } = render(<Agents />);

    await screen.findByTestId('agents-page');
    fireEvent.click(screen.getByTestId('agents-scene-manage'));
    expect(await screen.findByText('Main')).toBeInTheDocument();

    agentsState.loading = true;
    await act(async () => {
      rerender(<Agents />);
    });

    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps the blocking spinner during the initial load before any stable snapshot exists', async () => {
    agentsState.loading = true;
    fetchAgentsMock.mockImplementation(() => new Promise(() => {}));
    refreshProviderSnapshotMock.mockImplementation(() => new Promise(() => {}));
    hostApiFetchMock.mockImplementation(() => new Promise(() => {}));

    const { container } = render(<Agents />);

    expect(container.querySelector('svg.animate-spin')).toBeTruthy();
    expect(screen.queryByText('title')).not.toBeInTheDocument();
  });

  it('defaults to the market with category sections and installs templates from lazy detail', async () => {
    render(<Agents />);

    expect(await screen.findByTestId('agents-market')).toBeInTheDocument();
    expect(screen.getByTestId('agents-category-engineering')).toBeInTheDocument();
    expect(screen.getByTestId('agents-market-section-engineering')).toHaveTextContent('Frontend Developer');
    expect(screen.getByTestId('agent-template-frontend-developer')).toHaveTextContent('frontend');
    expect(screen.getByTestId('agent-template-frontend-developer')).toHaveTextContent('ui');
    expect(screen.getByTestId('agent-template-frontend-developer')).not.toHaveTextContent('react');
    expect(screen.getByTestId('agent-template-frontend-developer')).toHaveTextContent('563');
    expect(screen.getByTestId('agent-template-frontend-developer')).toHaveTextContent('1.8k');
    expect(screen.queryByTestId('agents-market-section-design')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('agents-category-design'));
    expect(await screen.findByTestId('agents-market-section-design')).toHaveTextContent('UI Designer');
    expect(screen.queryByTestId('agents-market-section-engineering')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('agents-category-engineering'));

    fireEvent.click(screen.getByTestId('agent-template-add-frontend-developer'));

    await waitFor(() => {
      expect(loadAgentTemplateDetailMock).toHaveBeenCalledWith('frontend-developer', 'engineering');
      expect(createAgentFromTemplateMock).toHaveBeenCalledWith(templateDetail);
    });
  });

  it('starts chat for an installed imported template from the market', async () => {
    agentsState.agents = [
      {
        id: 'frontend-developer',
        templateId: 'frontend-developer',
        name: 'Frontend Developer',
        isDefault: false,
        modelDisplay: 'gpt-5',
        modelRef: 'openai/gpt-5',
        overrideModelRef: null,
        inheritedModel: true,
        workspace: '~/.openclaw/workspace-frontend-developer',
        agentDir: '~/.openclaw/agents/frontend-developer/agent',
        mainSessionKey: 'agent:frontend-developer:main',
        channelTypes: [],
      },
    ];

    render(<Agents />);

    expect(screen.queryByText('Added')).not.toBeInTheDocument();
    expect(screen.queryByText('已添加')).not.toBeInTheDocument();
    expect(screen.queryByText('追加済み')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('agent-template-chat-frontend-developer'));

    expect(switchSessionMock).toHaveBeenCalledWith('agent:frontend-developer:main');
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('opens the management file drawer and saves edited workspace files', async () => {
    agentsState.agents = [
      {
        id: 'frontend-developer',
        name: 'Frontend Developer',
        isDefault: false,
        modelDisplay: 'gpt-5',
        modelRef: 'openai/gpt-5',
        overrideModelRef: null,
        inheritedModel: true,
        workspace: '~/.openclaw/workspace-frontend-developer',
        agentDir: '~/.openclaw/agents/frontend-developer/agent',
        mainSessionKey: 'agent:frontend-developer:main',
        channelTypes: [],
        sourceRepo: 'msitarzewski/agency-agents',
        sourcePath: 'engineering/engineering-frontend-developer.md',
      },
    ];
    hostApiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === '/api/channels/accounts') return Promise.resolve({ success: true, channels: [] });
      if (path.includes('/files/AGENTS.md') && options?.method === 'PUT') return Promise.resolve({ success: true, content: 'updated' });
      if (path.includes('/files/AGENTS.md')) return Promise.resolve({ success: true, content: 'original' });
      return Promise.resolve({ success: true });
    });

    render(<Agents />);

    fireEvent.click(await screen.findByTestId('agents-scene-manage'));
    fireEvent.click(screen.getByTestId('agent-files-frontend-developer'));

    const editor = await screen.findByTestId('agent-file-editor');
    expect(editor).toHaveValue('original');
    fireEvent.change(editor, { target: { value: 'updated' } });
    fireEvent.click(screen.getByTestId('agent-file-save'));

    await waitFor(() => {
      expect(hostApiFetchMock).toHaveBeenCalledWith(
        '/api/agents/frontend-developer/files/AGENTS.md',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ content: 'updated' }),
        }),
      );
    });
  });
});
