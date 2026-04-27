import { beforeEach, describe, expect, it } from 'vitest';
import { useSpriteStore } from '@/stores/sprite';
import { createSpritePlaybackSnapshot } from '@/lib/sprite-queue';

describe('sprite store transition routing', () => {
  beforeEach(() => {
    const initialSnapshot = createSpritePlaybackSnapshot('raccoon', 'idle', 'idle');
    useSpriteStore.setState({
      characterId: 'raccoon',
      signals: {
        inputFocused: false,
        hasDraft: false,
        sending: false,
        pendingFinal: false,
        hasStreaming: false,
        windowFocused: true,
        documentVisible: true,
      },
      currentState: initialSnapshot.currentState,
      settledState: initialSnapshot.settledState,
      requestedState: initialSnapshot.requestedState,
      transitionMode: initialSnapshot.transitionMode,
      activeClip: initialSnapshot.activeClip,
      playbackQueue: initialSnapshot.playbackQueue,
      queueVersion: initialSnapshot.queueVersion,
    });
  });

  it('updates requested state to listen without directly mutating current display state', () => {
    useSpriteStore.getState().setSignals({ inputFocused: true });
    expect(useSpriteStore.getState().currentState).toBe('idle');
    expect(useSpriteStore.getState().requestedState).toBe('listen');
    expect(useSpriteStore.getState().transitionMode).toBe('bridging');
    expect(useSpriteStore.getState().playbackQueue.map((clip) => `${clip.state}:${clip.phase}`)).toEqual([
      'listen:enter',
      'listen:loop',
    ]);
  });

  it('marks a non-idle to non-idle change as bridging', () => {
    useSpriteStore.setState({
      currentState: 'listen',
      settledState: 'listen',
      requestedState: 'listen',
      transitionMode: 'steady',
      activeClip: { src: 'listen-loop', state: 'listen', phase: 'loop' },
      playbackQueue: [{ src: 'listen-loop', state: 'listen', phase: 'loop' }],
      queueVersion: 1,
    });

    useSpriteStore.getState().setSignals({
      inputFocused: false,
      sending: true,
    });

    expect(useSpriteStore.getState().requestedState).toBe('working');
    expect(useSpriteStore.getState().currentState).toBe('listen');
    expect(useSpriteStore.getState().transitionMode).toBe('bridging');
    expect(useSpriteStore.getState().playbackQueue.map((clip) => `${clip.state}:${clip.phase}`)).toEqual([
      'listen:exit',
      'working:enter',
      'working:loop',
    ]);
  });

  it('queues sleep exit when focus returns from a settled sleep loop', () => {
    useSpriteStore.setState({
      currentState: 'sleep',
      settledState: 'sleep',
      requestedState: 'sleep',
      transitionMode: 'steady',
      activeClip: { src: 'sleep-loop', state: 'sleep', phase: 'loop' },
      playbackQueue: [{ src: 'sleep-loop', state: 'sleep', phase: 'loop' }],
      queueVersion: 2,
    });

    useSpriteStore.getState().setSignals({
      windowFocused: true,
      inputFocused: false,
      hasDraft: false,
      sending: false,
      pendingFinal: false,
      hasStreaming: false,
      documentVisible: true,
    });

    expect(useSpriteStore.getState().requestedState).toBe('idle');
    expect(useSpriteStore.getState().transitionMode).toBe('bridging');
    expect(useSpriteStore.getState().playbackQueue.map((clip) => `${clip.state}:${clip.phase}`)).toEqual([
      'sleep:exit',
      'idle:loop',
    ]);
  });
});
