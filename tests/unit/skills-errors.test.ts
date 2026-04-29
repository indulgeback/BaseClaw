import { beforeEach, describe, expect, it, vi } from 'vitest';

const hostApiFetchMock = vi.fn();
const rpcMock = vi.fn();

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: (...args: unknown[]) => hostApiFetchMock(...args),
}));

vi.mock('@/stores/gateway', () => ({
  useGatewayStore: {
    getState: () => ({
      rpc: (...args: unknown[]) => rpcMock(...args),
    }),
  },
}));

describe('skills store error mapping', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('maps fetchSkills rate-limit error by AppError code', async () => {
    rpcMock.mockResolvedValueOnce({ skills: [] });
    hostApiFetchMock.mockRejectedValueOnce(new Error('rate limit exceeded'));

    const { useSkillsStore } = await import('@/stores/skills');
    await useSkillsStore.getState().fetchSkills();

    expect(useSkillsStore.getState().error).toBe('fetchRateLimitError');
  });

  it('maps searchSkills timeout error by AppError code', async () => {
    hostApiFetchMock.mockRejectedValueOnce(new Error('request timeout'));

    const { useSkillsStore } = await import('@/stores/skills');
    await useSkillsStore.getState().searchSkills('git');

    expect(useSkillsStore.getState().searchError).toBe('searchTimeoutError');
  });

  it('maps installSkill timeout result into installTimeoutError', async () => {
    hostApiFetchMock.mockResolvedValueOnce({ success: false, error: 'request timeout' });

    const { useSkillsStore } = await import('@/stores/skills');
    await expect(useSkillsStore.getState().installSkill('demo-skill')).rejects.toThrow('installTimeoutError');
  });

  it('prefers local market preset markers over generic managed gateway source', async () => {
    rpcMock.mockResolvedValueOnce({
      skills: [{
        skillKey: 'pdf',
        slug: 'pdf',
        name: 'pdf',
        description: 'Work with PDFs.',
        disabled: false,
        bundled: false,
        source: 'openclaw-managed',
      }],
    });
    hostApiFetchMock
      .mockResolvedValueOnce({
        success: true,
        results: [{
          slug: 'pdf',
          version: 'bundle',
          source: 'clawx-market-preset',
          baseDir: '/tmp/skills/pdf',
        }],
      })
      .mockResolvedValueOnce({});

    const { useSkillsStore } = await import('@/stores/skills');
    await useSkillsStore.getState().fetchSkills();

    expect(useSkillsStore.getState().skills[0]).toEqual(expect.objectContaining({
      id: 'pdf',
      source: 'clawx-market-preset',
      sourceKind: 'market-preset',
    }));
  });
});
