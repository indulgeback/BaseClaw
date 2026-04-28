import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'http';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const parseJsonBodyMock = vi.fn();
const sendJsonMock = vi.fn();
const testOpenClawConfigDir = join(tmpdir(), 'clawx-tests', 'cron-routes-openclaw');

vi.mock('@electron/api/route-utils', () => ({
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
  sendJson: (...args: unknown[]) => sendJsonMock(...args),
}));

vi.mock('@electron/utils/paths', () => ({
  getOpenClawConfigDir: () => testOpenClawConfigDir,
}));

vi.mock('@electron/utils/session-util', () => ({
  resolveAccountIdFromSessionHistory: vi.fn(),
}));

vi.mock('@electron/utils/agent-config', () => ({
  resolveAgentIdFromChannel: vi.fn(),
}));

describe('handleCronRoutes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    rmSync(testOpenClawConfigDir, { recursive: true, force: true });
  });

  it('falls back to persisted jobs.json when cron.list is unavailable', async () => {
    const cronDir = join(testOpenClawConfigDir, 'cron');
    mkdirSync(cronDir, { recursive: true });
    writeFileSync(join(cronDir, 'jobs.json'), JSON.stringify({
      version: 1,
      jobs: [{
        id: 'job-file',
        agentId: 'main',
        name: 'File job',
        enabled: true,
        createdAtMs: 1000,
        schedule: { kind: 'cron', expr: '0 8 * * *' },
        payload: { kind: 'systemEvent', text: 'Run from file' },
        state: { nextRunAtMs: 5000 },
      }],
    }), 'utf8');
    writeFileSync(join(cronDir, 'jobs-state.json'), JSON.stringify({
      version: 1,
      jobs: {
        'job-file': {
          updatedAtMs: 2000,
          state: {
            lastRunAtMs: 3000,
            lastStatus: 'ok',
            lastDurationMs: 42,
          },
        },
      },
    }), 'utf8');

    const rpc = vi.fn().mockRejectedValue(new Error('gateway unavailable'));
    const { handleCronRoutes } = await import('@electron/api/routes/cron');
    const handled = await handleCronRoutes(
      { method: 'GET' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:13210/api/cron/jobs'),
      {
        gatewayManager: { rpc },
      } as never,
    );

    expect(handled).toBe(true);
    expect(sendJsonMock).toHaveBeenCalledWith(
      expect.anything(),
      200,
      [expect.objectContaining({
        id: 'job-file',
        name: 'File job',
        message: 'Run from file',
        agentId: 'main',
        lastRun: expect.objectContaining({ success: true, duration: 42 }),
        _fromFallback: true,
      })],
    );
  });

  it('merges persisted non-main agent jobs when gateway returns a partial cron list', async () => {
    const cronDir = join(testOpenClawConfigDir, 'cron');
    mkdirSync(cronDir, { recursive: true });
    writeFileSync(join(cronDir, 'jobs.json'), JSON.stringify({
      version: 1,
      jobs: [
        {
          id: 'job-main',
          agentId: 'main',
          name: 'Gateway main job',
          enabled: true,
          createdAtMs: 1000,
          updatedAtMs: 1000,
          schedule: { kind: 'cron', expr: '0 8 * * *' },
          payload: { kind: 'agentTurn', message: 'Main task' },
          state: {},
        },
        {
          id: 'job-research',
          agentId: 'research',
          name: 'Research job',
          enabled: true,
          createdAtMs: 2000,
          updatedAtMs: 2000,
          schedule: { kind: 'cron', expr: '0 9 * * *' },
          payload: { kind: 'agentTurn', message: 'Research task' },
          state: {},
        },
      ],
    }), 'utf8');

    const rpc = vi.fn().mockResolvedValue({
      jobs: [{
        id: 'job-main',
        name: 'Gateway main job',
        enabled: true,
        createdAtMs: 1000,
        updatedAtMs: 3000,
        schedule: { kind: 'cron', expr: '0 8 * * *' },
        payload: { kind: 'agentTurn', message: 'Main task from gateway' },
        state: {},
      }],
    });

    const { handleCronRoutes } = await import('@electron/api/routes/cron');
    const handled = await handleCronRoutes(
      { method: 'GET' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:13210/api/cron/jobs'),
      {
        gatewayManager: { rpc },
      } as never,
    );

    expect(handled).toBe(true);
    expect(sendJsonMock).toHaveBeenCalledWith(
      expect.anything(),
      200,
      expect.arrayContaining([
        expect.objectContaining({
          id: 'job-main',
          agentId: 'main',
          message: 'Main task from gateway',
        }),
        expect.objectContaining({
          id: 'job-research',
          agentId: 'research',
          message: 'Research task',
        }),
      ]),
    );
  });

  it('creates cron jobs with external delivery configuration', async () => {
    parseJsonBodyMock.mockResolvedValue({
      name: 'Weather delivery',
      message: 'Summarize today',
      schedule: '0 9 * * *',
      delivery: {
        mode: 'announce',
        channel: 'feishu',
        to: 'user:ou_weather',
      },
      enabled: true,
    });

    const rpc = vi.fn().mockResolvedValue({
      id: 'job-1',
      name: 'Weather delivery',
      enabled: true,
      createdAtMs: 1,
      updatedAtMs: 2,
      schedule: { kind: 'cron', expr: '0 9 * * *' },
      payload: { kind: 'agentTurn', message: 'Summarize today' },
      delivery: { mode: 'announce', channel: 'feishu', to: 'user:ou_weather' },
      state: {},
    });

    const { handleCronRoutes } = await import('@electron/api/routes/cron');
    const handled = await handleCronRoutes(
      { method: 'POST' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:13210/api/cron/jobs'),
      {
        gatewayManager: { rpc },
      } as never,
    );

    expect(handled).toBe(true);
    expect(rpc).toHaveBeenCalledWith('cron.add', expect.objectContaining({
      delivery: { mode: 'announce', channel: 'feishu', to: 'user:ou_weather' },
    }));
    expect(sendJsonMock).toHaveBeenCalledWith(
      expect.anything(),
      200,
      expect.objectContaining({
        id: 'job-1',
        delivery: { mode: 'announce', channel: 'feishu', to: 'user:ou_weather' },
      }),
    );
  });

  it('updates cron jobs with transformed payload and delivery fields', async () => {
    parseJsonBodyMock.mockResolvedValue({
      message: 'Updated prompt',
      delivery: {
        mode: 'announce',
        channel: 'feishu',
        to: 'user:ou_next',
      },
    });

    const rpc = vi.fn().mockResolvedValue({
      id: 'job-2',
      name: 'Updated job',
      enabled: true,
      createdAtMs: 1,
      updatedAtMs: 3,
      schedule: { kind: 'cron', expr: '0 9 * * *' },
      payload: { kind: 'agentTurn', message: 'Updated prompt' },
      delivery: { mode: 'announce', channel: 'feishu', to: 'user:ou_next' },
      state: {},
    });

    const { handleCronRoutes } = await import('@electron/api/routes/cron');
    await handleCronRoutes(
      { method: 'PUT' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:13210/api/cron/jobs/job-2'),
      {
        gatewayManager: { rpc },
      } as never,
    );

    expect(rpc).toHaveBeenCalledWith('cron.update', {
      id: 'job-2',
      patch: {
        payload: { kind: 'agentTurn', message: 'Updated prompt' },
        delivery: { mode: 'announce', channel: 'feishu', to: 'user:ou_next' },
      },
    });
    expect(sendJsonMock).toHaveBeenCalledWith(
      expect.anything(),
      200,
      expect.objectContaining({
        id: 'job-2',
        message: 'Updated prompt',
        delivery: { mode: 'announce', channel: 'feishu', to: 'user:ou_next' },
      }),
    );
  });

  it('passes through delivery.accountId for multi-account cron jobs', async () => {
    parseJsonBodyMock.mockResolvedValue({
      delivery: {
        mode: 'announce',
        channel: 'feishu',
        to: 'user:ou_owner',
        accountId: 'feishu-0d009958',
      },
    });

    const rpc = vi.fn().mockResolvedValue({
      id: 'job-account',
      name: 'Account job',
      enabled: true,
      createdAtMs: 1,
      updatedAtMs: 4,
      schedule: { kind: 'cron', expr: '0 9 * * *' },
      payload: { kind: 'agentTurn', message: 'Prompt' },
      delivery: { mode: 'announce', channel: 'feishu', accountId: 'feishu-0d009958', to: 'user:ou_owner' },
      state: {},
    });

    const { handleCronRoutes } = await import('@electron/api/routes/cron');
    await handleCronRoutes(
      { method: 'PUT' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:13210/api/cron/jobs/job-account'),
      {
        gatewayManager: { rpc },
      } as never,
    );

    expect(rpc).toHaveBeenCalledWith('cron.update', {
      id: 'job-account',
      patch: {
        delivery: {
          mode: 'announce',
          channel: 'feishu',
          to: 'user:ou_owner',
          accountId: 'feishu-0d009958',
        },
      },
    });
  });

  it('allows WeChat scheduled delivery', async () => {
    parseJsonBodyMock.mockResolvedValue({
      name: 'WeChat delivery',
      message: 'Send update',
      schedule: '0 10 * * *',
      delivery: {
        mode: 'announce',
        channel: 'wechat',
        to: 'wechat:wxid_target',
        accountId: 'wechat-bot',
      },
      enabled: true,
    });

    const rpc = vi.fn().mockResolvedValue({
      id: 'job-wechat',
      name: 'WeChat delivery',
      enabled: true,
      createdAtMs: 1,
      updatedAtMs: 2,
      schedule: { kind: 'cron', expr: '0 10 * * *' },
      payload: { kind: 'agentTurn', message: 'Send update' },
      delivery: { mode: 'announce', channel: 'openclaw-weixin', to: 'wechat:wxid_target', accountId: 'wechat-bot' },
      state: {},
    });

    const { handleCronRoutes } = await import('@electron/api/routes/cron');
    const handled = await handleCronRoutes(
      { method: 'POST' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:13210/api/cron/jobs'),
      {
        gatewayManager: { rpc },
      } as never,
    );

    expect(handled).toBe(true);
    expect(rpc).toHaveBeenCalledWith('cron.add', expect.objectContaining({
      delivery: expect.objectContaining({ mode: 'announce', to: 'wechat:wxid_target' }),
    }));
    expect(sendJsonMock).toHaveBeenCalledWith(
      expect.anything(),
      200,
      expect.objectContaining({
        id: 'job-wechat',
      }),
    );
  });
});
