import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Skills } from '@/pages/Skills/index';

const hostApiFetchMock = vi.fn();
const invokeIpcMock = vi.fn();
const fetchSkillsMock = vi.fn();
const enableSkillMock = vi.fn();
const disableSkillMock = vi.fn();
const searchSkillsMock = vi.fn();
const installSkillMock = vi.fn();
const installPresetSkillMock = vi.fn();
const uninstallSkillMock = vi.fn();

const { gatewayState, skillsState, marketCatalog, templateDetail, loadSkillTemplateDetailMock, tMock } = vi.hoisted(() => ({
  gatewayState: {
    status: { state: 'running', port: 18789 },
  },
  skillsState: {
    skills: [] as Array<Record<string, unknown>>,
    loading: false,
    error: null as string | null,
    searchResults: [] as Array<Record<string, unknown>>,
    searching: false,
    searchError: null as string | null,
    installing: {} as Record<string, boolean>,
  },
  marketCatalog: {
    sourceRepo: 'clawx/preinstalled-skills',
    sourceCommit: 'bundle',
    sourceCommitShort: 'bundle',
    generatedAt: '2026-04-24T00:00:00.000Z',
    categories: [
      { id: 'documents', name: 'Documents', count: 1 },
      { id: 'research', name: 'Research', count: 1 },
    ],
    templates: [
      {
        id: 'pdf',
        templateId: 'pdf',
        name: 'pdf',
        description: 'Work with PDF files.',
        categoryId: 'documents',
        category: 'Documents',
        version: 'b9e19e6',
        badge: 'Built-in',
        status: 'stable' as const,
        tags: [],
        emoji: '📄',
        sourceRepo: 'anthropics/skills',
        sourceCommit: 'b9e19e6f44773509fbdd7001d77ff41a49a486c1',
        sourcePath: 'skills/pdf',
        previewFiles: ['SKILL.md'],
      },
      {
        id: 'tavily-search',
        templateId: 'tavily-search',
        name: 'tavily-search',
        description: 'Search the web with Tavily.',
        categoryId: 'research',
        category: 'Research',
        version: 'a0fe267',
        badge: 'Built-in',
        status: 'stable' as const,
        tags: [],
        emoji: '🔎',
        sourceRepo: 'tavily-ai/skills',
        sourceCommit: 'a0fe267bf6bebb71f9e20d6b4ed8afa1251d29c6',
        sourcePath: 'skills/tavily-search',
        previewFiles: ['SKILL.md'],
      },
    ],
  },
  templateDetail: {
    id: 'pdf',
    templateId: 'pdf',
    name: 'pdf',
    description: 'Work with PDF files.',
    categoryId: 'documents',
    category: 'Documents',
    version: 'b9e19e6',
    badge: 'Built-in',
    status: 'stable' as const,
    tags: [],
    emoji: '📄',
    sourceRepo: 'anthropics/skills',
    sourceCommit: 'b9e19e6f44773509fbdd7001d77ff41a49a486c1',
    sourcePath: 'skills/pdf',
    previewFiles: ['SKILL.md'],
    files: {
      'SKILL.md': '---\nname: pdf\n---\n# PDF',
    },
  },
  loadSkillTemplateDetailMock: vi.fn(),
  tMock: vi.fn((key: string, options?: Record<string, unknown>) => {
    if (key === 'filter.all') return `all (${options?.count ?? 0})`;
    if (key === 'filter.bundled') return `bundled (${options?.count ?? 0})`;
    if (key === 'filter.builtInMarket') return `market skills (${options?.count ?? 0})`;
    if (key === 'filter.clawhub') return `clawhub (${options?.count ?? 0})`;
    if (key === 'market.categoryCount') return `${options?.count ?? 0} presets`;
    if (key === 'toast.presetInstalled') return `${options?.name ?? 'skill'} added`;
    return key;
  }),
}));

vi.mock('@/stores/gateway', () => ({
  useGatewayStore: (selector: (state: typeof gatewayState) => unknown) => selector(gatewayState),
}));

vi.mock('@/stores/skills', () => ({
  useSkillsStore: (selector?: (state: typeof skillsState & {
    fetchSkills: typeof fetchSkillsMock;
    enableSkill: typeof enableSkillMock;
    disableSkill: typeof disableSkillMock;
    searchSkills: typeof searchSkillsMock;
    installSkill: typeof installSkillMock;
    installPresetSkill: typeof installPresetSkillMock;
    uninstallSkill: typeof uninstallSkillMock;
  }) => unknown) => {
    const state = {
      ...skillsState,
      fetchSkills: fetchSkillsMock,
      enableSkill: enableSkillMock,
      disableSkill: disableSkillMock,
      searchSkills: searchSkillsMock,
      installSkill: installSkillMock,
      installPresetSkill: installPresetSkillMock,
      uninstallSkill: uninstallSkillMock,
    };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: (...args: unknown[]) => hostApiFetchMock(...args),
}));

vi.mock('@/lib/api-client', () => ({
  invokeIpc: (...args: unknown[]) => invokeIpcMock(...args),
}));

vi.mock('@/lib/skill-market', () => ({
  getSkillMarketCatalog: () => marketCatalog,
  loadSkillTemplateDetail: (...args: unknown[]) => loadSkillTemplateDetailMock(...args),
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
    info: vi.fn(),
  },
}));

describe('Skills page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gatewayState.status = { state: 'running', port: 18789 };
    skillsState.skills = [];
    skillsState.loading = false;
    skillsState.error = null;
    skillsState.searchResults = [];
    skillsState.searching = false;
    skillsState.searchError = null;
    skillsState.installing = {};
    fetchSkillsMock.mockResolvedValue(undefined);
    enableSkillMock.mockResolvedValue(undefined);
    disableSkillMock.mockResolvedValue(undefined);
    searchSkillsMock.mockResolvedValue(undefined);
    installSkillMock.mockResolvedValue(undefined);
    installPresetSkillMock.mockResolvedValue(undefined);
    uninstallSkillMock.mockResolvedValue(undefined);
    loadSkillTemplateDetailMock.mockResolvedValue(templateDetail);
    hostApiFetchMock.mockResolvedValue({ success: true });
    invokeIpcMock.mockImplementation(async (channel: string) => {
      if (channel === 'openclaw:getSkillsDir') return '/tmp/skills';
      if (channel === 'skill:updateConfig') return { success: true };
      if (channel === 'shell:openPath') return '';
      return null;
    });
  });

  it('defaults to the market with category sections and installs preset templates', async () => {
    render(<Skills />);

    expect(await screen.findByTestId('skills-market')).toBeInTheDocument();
    expect(screen.getByTestId('skills-market-section-documents')).toHaveTextContent('pdf');

    fireEvent.click(screen.getByTestId('skills-category-research'));
    expect(await screen.findByTestId('skills-market-section-research')).toHaveTextContent('tavily-search');

    fireEvent.click(screen.getByTestId('skills-category-documents'));
    fireEvent.click(screen.getByTestId('skill-template-add-pdf'));

    await waitFor(() => {
      expect(loadSkillTemplateDetailMock).toHaveBeenCalledWith('pdf', 'documents');
      expect(installPresetSkillMock).toHaveBeenCalledWith('pdf', 'documents');
    });
  });

  it('shows manage action instead of added when a preset is already installed', async () => {
    skillsState.skills = [
      {
        id: 'pdf',
        slug: 'pdf',
        name: 'pdf',
        description: 'Work with PDF files.',
        enabled: true,
        source: 'clawx-market-preset',
        sourceKind: 'market-preset',
        baseDir: '/tmp/skills/pdf',
      },
    ];

    render(<Skills />);

    expect(await screen.findByTestId('skill-template-manage-pdf')).toBeInTheDocument();
    expect(screen.queryByText('Added')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('skill-template-manage-pdf'));

    await waitFor(() => {
      expect(screen.getByTestId('skills-manage')).toBeInTheDocument();
      expect(screen.getByTestId('skill-detail-drawer')).toBeInTheDocument();
    });
  });

  it('moves batch controls and ClawHub install entry into manage scene and keeps config save working', async () => {
    skillsState.skills = [
      {
        id: 'pdf',
        slug: 'pdf',
        name: 'pdf',
        description: 'Work with PDF files.',
        enabled: true,
        source: 'clawx-market-preset',
        sourceKind: 'market-preset',
        version: '1.0.0',
        isCore: false,
        isBundled: false,
        baseDir: '/tmp/skills/pdf',
        config: {
          apiKey: 'secret',
          env: {
            PDF_MODE: 'fast',
          },
        },
      },
    ];

    render(<Skills />);

    expect(screen.queryByText('actions.enableVisible')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('skills-scene-manage'));

    expect(await screen.findByText('actions.enableVisible')).toBeInTheDocument();
    expect(screen.getByTestId('skills-open-install-drawer')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('skill-card-pdf'));
    expect(await screen.findByTestId('skill-detail-drawer')).toBeInTheDocument();

    fireEvent.click(screen.getByText('detail.saveConfig'));
    await waitFor(() => {
      expect(invokeIpcMock).toHaveBeenCalledWith(
        'skill:updateConfig',
        expect.objectContaining({ skillKey: 'pdf' }),
      );
      expect(fetchSkillsMock).toHaveBeenCalled();
    });
  });

  it('runs batch toggles from the manage scene against the visible filtered skills', async () => {
    skillsState.skills = [
      {
        id: 'pdf',
        slug: 'pdf',
        name: 'pdf',
        description: 'Work with PDF files.',
        enabled: false,
        sourceKind: 'market-preset',
      },
      {
        id: 'tavily-search',
        slug: 'tavily-search',
        name: 'tavily-search',
        description: 'Search the web with Tavily.',
        enabled: false,
        sourceKind: 'clawhub',
      },
    ];

    render(<Skills />);

    fireEvent.click(screen.getByTestId('skills-scene-manage'));
    await screen.findByTestId('skills-manage');
    fireEvent.click(screen.getByText('market skills (1)'));
    fireEvent.click(screen.getByText('actions.enableVisible'));

    await waitFor(() => {
      expect(enableSkillMock).toHaveBeenCalledWith('pdf');
      expect(enableSkillMock).not.toHaveBeenCalledWith('tavily-search');
    });
  });
});
