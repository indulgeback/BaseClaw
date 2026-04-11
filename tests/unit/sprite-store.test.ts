import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpriteStore } from '@/stores/sprite';

describe('sprite store transition routing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
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
      currentState: 'idle',
      desiredState: 'idle',
      transitionMode: 'steady',
    });
  });

  it('moves from idle to listen directly', () => {
    useSpriteStore.getState().setSignals({ inputFocused: true });
    expect(useSpriteStore.getState().currentState).toBe('listen');
  });

  it('routes listen to working through idle first', () => {
    useSpriteStore.getState().setSignals({ inputFocused: true });
    expect(useSpriteStore.getState().currentState).toBe('listen');

    useSpriteStore.getState().setSignals({
      inputFocused: false,
      sending: true,
    });

    expect(useSpriteStore.getState().currentState).toBe('idle');
    expect(useSpriteStore.getState().desiredState).toBe('working');

    vi.runAllTimers();
    expect(useSpriteStore.getState().currentState).toBe('working');
  });

  it('routes sleep to listen through idle first', () => {
    useSpriteStore.getState().setSignals({ windowFocused: false });
    expect(useSpriteStore.getState().currentState).toBe('sleep');

    useSpriteStore.getState().setSignals({
      windowFocused: true,
      inputFocused: true,
    });

    expect(useSpriteStore.getState().currentState).toBe('idle');
    vi.runAllTimers();
    expect(useSpriteStore.getState().currentState).toBe('listen');
  });
});
