import { describe, expect, it } from 'vitest';
import {
  advancePlaybackSnapshot,
  createSpritePlaybackSnapshot,
  planPath,
  reconcilePlaybackSnapshot,
} from '@/lib/sprite-queue';

describe('sprite clip queue planning', () => {
  it('plays enter then loop when leaving idle', () => {
    const sequence = planPath('raccoon', 'idle', 'listen');
    expect(sequence.map((item) => `${item.state}:${item.phase}`)).toEqual([
      'listen:enter',
      'listen:loop',
    ]);
  });

  it('routes non-idle to non-idle through exit and next enter', () => {
    const sequence = planPath('raccoon', 'listen', 'working');
    expect(sequence.map((item) => `${item.state}:${item.phase}`)).toEqual([
      'listen:exit',
      'idle:loop',
      'working:enter',
      'working:loop',
    ]);
  });

  it('replans a sleep loop wake-up through sleep exit without replaying sleep enter', () => {
    const sleeping = createSpritePlaybackSnapshot('raccoon', 'sleep', 'sleep');
    const waking = reconcilePlaybackSnapshot(sleeping, 'idle');

    expect(waking.activeClip).toEqual(sleeping.activeClip);
    expect(waking.playbackQueue.map((item) => `${item.state}:${item.phase}`)).toEqual([
      'sleep:exit',
      'idle:loop',
    ]);
  });

  it('finishes sleep enter before waking back to idle', () => {
    const enteringSleep = createSpritePlaybackSnapshot('raccoon', 'idle', 'sleep');
    const waking = reconcilePlaybackSnapshot(enteringSleep, 'idle');
    const afterEnter = advancePlaybackSnapshot(waking);

    expect(waking.activeClip && `${waking.activeClip.state}:${waking.activeClip.phase}`).toBe(
      'sleep:enter',
    );
    expect(afterEnter.activeClip && `${afterEnter.activeClip.state}:${afterEnter.activeClip.phase}`).toBe(
      'sleep:exit',
    );
    expect(afterEnter.playbackQueue.map((item) => `${item.state}:${item.phase}`)).toEqual([
      'idle:loop',
    ]);
  });

  it('keeps only the latest requested state when signals change rapidly', () => {
    const listening = createSpritePlaybackSnapshot('raccoon', 'listen', 'listen');
    const toWorking = reconcilePlaybackSnapshot(listening, 'working');
    const toIdle = reconcilePlaybackSnapshot(toWorking, 'idle');

    expect(toIdle.playbackQueue.map((item) => `${item.state}:${item.phase}`)).toEqual([
      'listen:exit',
      'idle:loop',
    ]);
  });

  it('queues another loop pass when the requested state remains unchanged', () => {
    const toListen = createSpritePlaybackSnapshot('raccoon', 'idle', 'listen');
    const inListenLoop = advancePlaybackSnapshot(toListen);

    expect(inListenLoop.activeClip && `${inListenLoop.activeClip.state}:${inListenLoop.activeClip.phase}`).toBe(
      'listen:loop',
    );
    expect(inListenLoop.playbackQueue.map((item) => `${item.state}:${item.phase}`)).toEqual([
      'listen:loop',
    ]);
  });
});
