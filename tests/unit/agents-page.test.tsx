import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Agents } from '../../src/pages/Agents/index';

const hostApiFetchMock = vi.fn();
const subscribeHostEventMock = vi.fn();
const fetchAgentsMock = vi.fn();
const updateAgentMock = vi.fn();
const updateAgentModelMock = vi.fn();
const refreshProviderSnapshotMock = vi.fn();
const fetchSkillsMock = vi.fn();

const { gatewayState, agentsState, providersState, skillsState, createAgentMock, deleteAgentMock } = vi.hoisted(() => ({
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
  skillsState: {
    skills: [] as Array<Record<string, unknown>>,
    loading: false,
  },
  createAgentMock: vi.fn(),
  deleteAgentMock: vi.fn(),
}));

vi.mock('@/stores/gateway', () => ({
  useGatewayStore: (selector: (state: typeof gatewayState) => unknown) => selector(gatewayState),
}));

vi.mock('@/stores/agents', () => ({
  useAgentsStore: (selector?: (state: typeof agentsState & {
    fetchAgents: typeof fetchAgentsMock;
    updateAgent: typeof updateAgentMock;
    updateAgentModel: typeof updateAgentModelMock;
    createAgent: typeof createAgentMock;
    deleteAgent: typeof deleteAgentMock;
  }) => unknown) => {
    const state = {
      ...agentsState,
      fetchAgents: fetchAgentsMock,
      updateAgent: updateAgentMock,
      updateAgentModel: updateAgentModelMock,
      createAgent: createAgentMock,
      deleteAgent: deleteAgentMock,
    };
    return typeof selector === 'function' ? selector(state) : state;
  },
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

vi.mock('@/stores/skills', () => ({
  useSkillsStore: (selector: (state: typeof skillsState & {
    fetchSkills: typeof fetchSkillsMock;
  }) => unknown) => {
    const state = {
      ...skillsState,
      fetchSkills: fetchSkillsMock,
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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
    i18n: { language: 'en', resolvedLanguage: 'en' },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

function renderAgents() {
  return render(
    <MemoryRouter>
      <Agents />
    </MemoryRouter>,
  );
}

function agentsView() {
  return (
    <MemoryRouter>
      <Agents />
    </MemoryRouter>
  );
}

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
    skillsState.skills = [];
    skillsState.loading = false;
    fetchAgentsMock.mockResolvedValue(undefined);
    fetchSkillsMock.mockResolvedValue(undefined);
    updateAgentMock.mockResolvedValue(undefined);
    updateAgentModelMock.mockResolvedValue(undefined);
    createAgentMock.mockResolvedValue(undefined);
    deleteAgentMock.mockResolvedValue(undefined);
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

    renderAgents();

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

    const { rerender } = renderAgents();

    await waitFor(() => {
      expect(fetchAgentsMock).toHaveBeenCalledTimes(1);
      expect(hostApiFetchMock).toHaveBeenCalledWith('/api/channels/accounts');
    });

    gatewayState.status = { state: 'running', port: 18789 };
    await act(async () => {
      rerender(agentsView());
    });

    await waitFor(() => {
      const channelFetchCalls = hostApiFetchMock.mock.calls.filter(([path]) => path === '/api/channels/accounts');
      expect(channelFetchCalls).toHaveLength(2);
    });
  });

  it('uses "Use default model" as form fill only and disables it when already default', async () => {
    agentsState.agents = [
      {
        id: 'anthropologist',
        name: 'Anthropologist',
        isDefault: true,
        modelDisplay: 'claude-opus-4.6',
        modelRef: 'openrouter/anthropic/claude-opus-4.6',
        overrideModelRef: null,
        inheritedModel: true,
        workspace: '~/.openclaw/agency-agents/anthropologist',
        agentDir: '~/.openclaw/agents/anthropologist/agent',
        mainSessionKey: 'agent:anthropologist:desk',
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

    renderAgents();

    await waitFor(() => {
      expect(fetchAgentsMock).toHaveBeenCalledTimes(1);
    });

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
        id: 'anthropologist',
        name: 'Anthropologist',
        isDefault: true,
        modelDisplay: 'gpt-5',
        modelRef: 'openai/gpt-5',
        overrideModelRef: null,
        inheritedModel: true,
        workspace: '~/.openclaw/agency-agents/anthropologist',
        agentDir: '~/.openclaw/agents/anthropologist/agent',
        mainSessionKey: 'agent:anthropologist:main',
        channelTypes: [],
      },
    ];

    const { rerender } = renderAgents();

    expect(await screen.findByText('Anthropologist')).toBeInTheDocument();

    agentsState.loading = true;
    await act(async () => {
      rerender(agentsView());
    });

    expect(screen.getByText('Anthropologist')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows only user-created agents in the My Employees filter', async () => {
    agentsState.agents = [
      {
        id: 'main',
        name: 'Main Agent',
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
      {
        id: 'anthropologist',
        name: 'Anthropologist',
        isDefault: false,
        modelDisplay: 'gpt-5',
        modelRef: 'openai/gpt-5',
        overrideModelRef: null,
        inheritedModel: true,
        workspace: '~/.openclaw/agency-agents/anthropologist',
        agentDir: '~/.openclaw/agents/anthropologist/agent',
        mainSessionKey: 'agent:anthropologist:main',
        channelTypes: [],
      },
      {
        id: 'custom-sales-helper',
        name: 'Custom Sales Helper',
        description: 'Helps with personal sales follow-up.',
        isDefault: false,
        modelDisplay: 'gpt-5',
        modelRef: 'openai/gpt-5',
        overrideModelRef: null,
        inheritedModel: true,
        workspace: '~/.openclaw/agents/custom-sales-helper/workspace',
        agentDir: '~/.openclaw/agents/custom-sales-helper/agent',
        mainSessionKey: 'agent:custom-sales-helper:main',
        channelTypes: [],
      },
    ];

    renderAgents();

    expect(await screen.findByText('Anthropologist')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'agency.mine' }));

    expect(screen.getByText('Custom Sales Helper')).toBeInTheDocument();
    expect(screen.getByText('Helps with personal sales follow-up.')).toBeInTheDocument();
    expect(screen.queryByText('Anthropologist')).not.toBeInTheDocument();
    expect(screen.queryByText('Main Agent')).not.toBeInTheDocument();
  });

  it('creates a custom digital employee from the expanded dialog', async () => {
    skillsState.skills = [
      {
        id: 'web-search',
        name: 'Web Search',
        description: 'Search the web.',
        enabled: false,
        isCore: false,
      },
      {
        id: 'core-runtime',
        name: 'Core Runtime',
        description: 'Always available.',
        enabled: true,
        isCore: true,
      },
    ];

    renderAgents();

    await waitFor(() => {
      expect(fetchAgentsMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'addAgent' }));

    const createButton = screen.getByRole('button', { name: 'createDialog.createButton' });
    expect(createButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/createDialog.nameLabel/), {
      target: { value: 'Research Helper' },
    });
    fireEvent.change(screen.getByLabelText(/createDialog.shortDescriptionLabel/), {
      target: { value: 'Finds and summarizes research signals.' },
    });
    fireEvent.change(screen.getByLabelText(/createDialog.instructionsLabel/), {
      target: { value: '## Role\n- Research topics carefully.\n## Style\n- Be concise.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'createDialog.skillsLabel' }));
    fireEvent.click(screen.getByRole('button', { name: /Web Search/ }));

    expect(createButton).toBeEnabled();
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(createAgentMock).toHaveBeenCalledWith('Research Helper', expect.objectContaining({
        inheritWorkspace: false,
        description: 'Finds and summarizes research signals.',
        instructions: '## Role\n- Research topics carefully.\n## Style\n- Be concise.',
        modelRef: null,
        skillIds: ['web-search'],
      }));
    });
  });

  it('keeps the blocking spinner during the initial load before any stable snapshot exists', async () => {
    agentsState.loading = true;
    fetchAgentsMock.mockImplementation(() => new Promise(() => {}));
    refreshProviderSnapshotMock.mockImplementation(() => new Promise(() => {}));
    hostApiFetchMock.mockImplementation(() => new Promise(() => {}));

    const { container } = renderAgents();

    expect(container.querySelector('svg.animate-spin')).toBeTruthy();
    expect(screen.queryByText('title')).not.toBeInTheDocument();
  });
});
