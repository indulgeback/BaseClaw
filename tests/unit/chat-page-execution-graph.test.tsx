import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';

const hostApiFetchMock = vi.fn();

const { gatewayState, agentsState, chatInputState } = vi.hoisted(() => ({
  gatewayState: {
    status: { state: 'running', port: 18789 },
  },
  agentsState: {
    agents: [{ id: 'main', name: 'main' }] as Array<Record<string, unknown>>,
    fetchAgents: vi.fn(),
  },
  chatInputState: {
    props: null as null | { onSend: (text: string, attachments?: never, targetAgentId?: string | null) => void },
  },
}));

vi.mock('@/stores/gateway', () => ({
  useGatewayStore: (selector: (state: typeof gatewayState) => unknown) => selector(gatewayState),
}));

vi.mock('@/stores/agents', () => ({
  useAgentsStore: (selector: (state: typeof agentsState) => unknown) => selector(agentsState),
}));

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: (...args: unknown[]) => hostApiFetchMock(...args),
}));

vi.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'executionGraph.collapsedSummary') {
        return `collapsed ${String(params?.toolCount ?? '')} ${String(params?.processCount ?? '')}`.trim();
      }
      if (key === 'executionGraph.agentRun') {
        return `Main execution`;
      }
      if (key === 'executionGraph.title') {
        return 'Execution Graph';
      }
      if (key === 'executionGraph.collapseAction') {
        return 'Collapse';
      }
      if (key === 'executionGraph.thinkingLabel') {
        return 'Thinking';
      }
      if (key.startsWith('taskPanel.stepStatus.')) {
        return key.split('.').at(-1) ?? key;
      }
      return key;
    },
  }),
}));

vi.mock('@/hooks/use-stick-to-bottom-instant', () => ({
  useStickToBottomInstant: () => ({
    contentRef: { current: null },
    scrollRef: { current: null },
  }),
}));

vi.mock('@/hooks/use-min-loading', () => ({
  useMinLoading: () => false,
}));

vi.mock('@/pages/Chat/ChatToolbar', () => ({
  ChatToolbar: () => null,
}));

vi.mock('@/pages/Chat/ChatInput', () => ({
  ChatInput: (props: { onSend: (text: string, attachments?: never, targetAgentId?: string | null) => void }) => {
    chatInputState.props = props;
    return null;
  },
}));

describe('Chat execution graph lifecycle', () => {
  beforeEach(async () => {
    vi.resetModules();
    hostApiFetchMock.mockReset();
    hostApiFetchMock.mockResolvedValue({ success: true, messages: [] });
    agentsState.fetchAgents.mockReset();
    chatInputState.props = null;

    const { useSpriteStore } = await import('@/stores/sprite');
    useSpriteStore.setState({
      signals: {
        inputFocused: false,
        hasDraft: false,
        sending: false,
        pendingFinal: false,
        hasStreaming: false,
        windowFocused: true,
        documentVisible: true,
      },
      currentState: 'idle',
      settledState: 'idle',
      requestedState: 'idle',
      transitionMode: 'steady',
      activeClip: {
        src: '/src/assets/sprites/raccoon/webm/sprite_raccoon_idle_loop_alpha_v01.webm',
        state: 'idle',
        phase: 'loop',
      },
      playbackQueue: [{
        src: '/src/assets/sprites/raccoon/webm/sprite_raccoon_idle_loop_alpha_v01.webm',
        state: 'idle',
        phase: 'loop',
      }],
      queueVersion: 0,
    });

    const { useChatStore } = await import('@/stores/chat');
    useChatStore.setState({
      messages: [
        {
          role: 'user',
          content: 'Check semiconductor chatter',
        },
        {
          role: 'assistant',
          id: 'tool-turn',
          content: [
            { type: 'text', text: 'Checked X.' },
            { type: 'tool_use', id: 'browser-search', name: 'browser', input: { action: 'search', query: 'semiconductor' } },
          ],
        },
      ],
      loading: false,
      error: null,
      sending: true,
      activeRunId: 'run-live',
      streamingText: '',
      streamingMessage: {
        role: 'assistant',
        id: 'final-stream',
        content: [
          { type: 'text', text: 'Checked X.' },
          { type: 'text', text: 'Checked X. Here is the summary.' },
        ],
      },
      streamingTools: [
        {
          toolCallId: 'browser-search',
          name: 'browser',
          status: 'completed',
          updatedAt: Date.now(),
        },
      ],
      pendingFinal: true,
      lastUserMessageAt: Date.now(),
      pendingToolImages: [],
      sessions: [{ key: 'agent:main:main' }],
      currentSessionKey: 'agent:main:main',
      currentAgentId: 'main',
      sessionLabels: {},
      sessionLastActivity: {},
      thinkingLevel: null,
    });
  });

  it('keeps the execution graph expanded while the reply is still streaming and shows only the reply suffix in the bubble', async () => {
    const { Chat } = await import('@/pages/Chat/index');

    render(<Chat />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-execution-graph')).toHaveAttribute('data-collapsed', 'false');
    });

    expect(screen.getByText('Here is the summary.')).toBeInTheDocument();
    expect(screen.queryByText('Checked X. Here is the summary.')).not.toBeInTheDocument();
  });

  it('renders the execution graph immediately for an active run before any stream content arrives', async () => {
    const { useChatStore } = await import('@/stores/chat');
    useChatStore.setState({
      messages: [
        {
          role: 'user',
          content: 'Check semiconductor chatter',
        },
      ],
      loading: false,
      error: null,
      sending: true,
      activeRunId: 'run-starting',
      streamingText: '',
      streamingMessage: null,
      streamingTools: [],
      pendingFinal: false,
      lastUserMessageAt: Date.now(),
      pendingToolImages: [],
      sessions: [{ key: 'agent:main:main' }],
      currentSessionKey: 'agent:main:main',
      currentAgentId: 'main',
      sessionLabels: {},
      sessionLastActivity: {},
      thinkingLevel: null,
    });

    const { Chat } = await import('@/pages/Chat/index');

    render(<Chat />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-execution-graph')).toHaveAttribute('data-collapsed', 'false');
    });

    expect(screen.getByTestId('chat-execution-step-thinking-trailing')).toBeInTheDocument();
    expect(screen.getAllByText('Thinking').length).toBeGreaterThan(0);
  });

  it('keeps the sprite working while an execution graph is active after sending briefly clears', async () => {
    const { useChatStore } = await import('@/stores/chat');
    useChatStore.setState({
      messages: [
        {
          role: 'user',
          content: 'Use tools without streaming yet',
        },
        {
          role: 'assistant',
          id: 'tool-turn',
          content: [
            { type: 'text', text: 'Checking the workspace.' },
            { type: 'tool_use', id: 'shell', name: 'shell', input: { command: 'ls' } },
          ],
        },
      ],
      loading: false,
      error: null,
      sending: false,
      activeRunId: null,
      streamingText: '',
      streamingMessage: null,
      streamingTools: [],
      pendingFinal: false,
      lastUserMessageAt: Date.now(),
      pendingToolImages: [],
      sessions: [{ key: 'agent:main:main' }],
      currentSessionKey: 'agent:main:main',
      currentAgentId: 'main',
      sessionLabels: {},
      sessionLastActivity: {},
      thinkingLevel: null,
    });

    const { Chat } = await import('@/pages/Chat/index');
    const { useSpriteStore } = await import('@/stores/sprite');

    render(<Chat />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-execution-graph')).toHaveAttribute('data-collapsed', 'false');
      expect(useSpriteStore.getState().requestedState).toBe('working');
    });
  });

  it('switches the sprite to working immediately when the composer submits', async () => {
    const { useChatStore } = await import('@/stores/chat');
    let resolveSend!: () => void;
    const sendMessageMock = vi.fn(() => new Promise<void>((resolve) => {
      resolveSend = resolve;
    }));
    useChatStore.setState({
      messages: [],
      loading: false,
      error: null,
      sending: false,
      activeRunId: null,
      streamingText: '',
      streamingMessage: null,
      streamingTools: [],
      pendingFinal: false,
      lastUserMessageAt: null,
      pendingToolImages: [],
      sessions: [{ key: 'agent:main:main' }],
      currentSessionKey: 'agent:main:main',
      currentAgentId: 'main',
      sessionLabels: {},
      sessionLastActivity: {},
      thinkingLevel: null,
      sendMessage: sendMessageMock,
    });

    const { Chat } = await import('@/pages/Chat/index');
    const { useSpriteStore } = await import('@/stores/sprite');
    const invokeMock = vi.mocked(window.electron.ipcRenderer.invoke);

    render(<Chat />);

    act(() => {
      useSpriteStore.getState().setSignals({ inputFocused: true, hasDraft: true });
    });

    act(() => {
      chatInputState.props?.onSend('start thinking');
    });

    await waitFor(() => {
      expect(useSpriteStore.getState().requestedState).toBe('working');
      expect(sendMessageMock).toHaveBeenCalledWith('start thinking', undefined, undefined);
      expect(invokeMock).toHaveBeenCalledWith(
        'sprite:overlaySyncState',
        expect.objectContaining({ requestedState: 'working' }),
      );
    });

    act(() => {
      useSpriteStore.getState().setSignals({ inputFocused: true, hasDraft: true });
    });

    expect(useSpriteStore.getState().requestedState).toBe('working');

    await act(async () => {
      resolveSend();
      await sendMessageMock.mock.results[0]?.value;
    });
  });
});
