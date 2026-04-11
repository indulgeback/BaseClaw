import { create } from 'zustand';
import type { SpriteCharacterId, SpriteSignals, SpriteState } from '@/types/sprite';
import { DEFAULT_SPRITE_CHARACTER_ID, DEFAULT_SPRITE_SIGNALS, buildSpritePayload, deriveSpriteState } from '@/lib/sprite';
import type { SpriteStatePayload } from '@/types/sprite';

type SpriteTransientState = {
  state: Extract<SpriteState, 'success' | 'error'>;
  expiresAt: number;
} | null;

let transientTimer: ReturnType<typeof setTimeout> | null = null;

function clearTransientTimer(): void {
  if (transientTimer) {
    clearTimeout(transientTimer);
    transientTimer = null;
  }
}

function resolveState(signals: SpriteSignals, transient: SpriteTransientState): SpriteState {
  if (transient && transient.expiresAt > Date.now()) return transient.state;
  return deriveSpriteState(signals);
}

interface SpriteStore {
  characterId: SpriteCharacterId;
  signals: SpriteSignals;
  transient: SpriteTransientState;
  currentState: SpriteState;
  setCharacterId: (characterId: SpriteCharacterId) => void;
  setSignals: (partial: Partial<SpriteSignals>) => void;
  flashState: (state: Extract<SpriteState, 'success' | 'error'>, durationMs?: number) => void;
  getPayload: () => SpriteStatePayload;
}

export const useSpriteStore = create<SpriteStore>((set, get) => ({
  characterId: DEFAULT_SPRITE_CHARACTER_ID,
  signals: DEFAULT_SPRITE_SIGNALS,
  transient: null,
  currentState: deriveSpriteState(DEFAULT_SPRITE_SIGNALS),
  setCharacterId: (characterId) => {
    set({ characterId });
  },
  setSignals: (partial) => {
    const nextSignals = { ...get().signals, ...partial };
    const activeTransient = get().transient;
    const nextTransient = activeTransient && activeTransient.expiresAt > Date.now() ? activeTransient : null;
    set({
      signals: nextSignals,
      transient: nextTransient,
      currentState: resolveState(nextSignals, nextTransient),
    });
  },
  flashState: (state, durationMs = 1400) => {
    clearTransientTimer();
    const nextTransient: SpriteTransientState = {
      state,
      expiresAt: Date.now() + durationMs,
    };
    set({
      transient: nextTransient,
      currentState: nextTransient.state,
    });
    transientTimer = setTimeout(() => {
      const currentSignals = get().signals;
      set({
        transient: null,
        currentState: deriveSpriteState(currentSignals),
      });
      clearTransientTimer();
    }, durationMs);
  },
  getPayload: () => {
    const state = get().currentState;
    return buildSpritePayload(get().characterId, state);
  },
}));
