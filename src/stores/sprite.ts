import { create } from 'zustand';
import type { SpriteCharacterId, SpriteSignals, SpriteState } from '@/types/sprite';
import { DEFAULT_SPRITE_CHARACTER_ID, DEFAULT_SPRITE_SIGNALS, buildSpritePayload, deriveSpriteState } from '@/lib/sprite';
import type { SpriteStatePayload } from '@/types/sprite';
import { SPRITE_IDLE_BRIDGE_MS } from '../../shared/sprite';

let bridgeTimer: ReturnType<typeof setTimeout> | null = null;

function clearBridgeTimer(): void {
  if (bridgeTimer) {
    clearTimeout(bridgeTimer);
    bridgeTimer = null;
  }
}

interface SpriteStore {
  characterId: SpriteCharacterId;
  signals: SpriteSignals;
  currentState: SpriteState;
  desiredState: SpriteState;
  transitionMode: 'steady' | 'bridging';
  setCharacterId: (characterId: SpriteCharacterId) => void;
  setSignals: (partial: Partial<SpriteSignals>) => void;
  getPayload: () => SpriteStatePayload;
}

export const useSpriteStore = create<SpriteStore>((set, get) => ({
  characterId: DEFAULT_SPRITE_CHARACTER_ID,
  signals: DEFAULT_SPRITE_SIGNALS,
  currentState: deriveSpriteState(DEFAULT_SPRITE_SIGNALS),
  desiredState: deriveSpriteState(DEFAULT_SPRITE_SIGNALS),
  transitionMode: 'steady',
  setCharacterId: (characterId) => {
    set({ characterId });
  },
  setSignals: (partial) => {
    const nextSignals = { ...get().signals, ...partial };
    const desiredState = deriveSpriteState(nextSignals);
    const { currentState, transitionMode } = get();

    set({ signals: nextSignals, desiredState });

    if (desiredState === currentState && transitionMode === 'steady') {
      return;
    }

    if (desiredState === 'idle') {
      clearBridgeTimer();
      set({ currentState: 'idle', transitionMode: 'steady' });
      return;
    }

    if (currentState === 'idle' && transitionMode === 'steady') {
      clearBridgeTimer();
      set({ currentState: desiredState, transitionMode: 'steady' });
      return;
    }

    clearBridgeTimer();
    set({ currentState: 'idle', transitionMode: 'bridging' });
    bridgeTimer = setTimeout(() => {
      const latest = get();
      if (latest.desiredState === 'idle') {
        set({ currentState: 'idle', transitionMode: 'steady' });
        clearBridgeTimer();
        return;
      }
      set({
        currentState: latest.desiredState,
        transitionMode: 'steady',
      });
      clearBridgeTimer();
    }, SPRITE_IDLE_BRIDGE_MS);
  },
  getPayload: () => {
    const state = get().currentState;
    return buildSpritePayload(get().characterId, state);
  },
}));
