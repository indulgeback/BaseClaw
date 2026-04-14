import { create } from 'zustand';
import type {
  SpriteCharacterId,
  SpriteClip,
  SpritePlaybackSnapshot,
  SpriteSignals,
  SpriteState,
  SpriteTransitionMode,
} from '@/types/sprite';
import {
  DEFAULT_SPRITE_CHARACTER_ID,
  DEFAULT_SPRITE_SIGNALS,
  buildSpritePayload,
  deriveSpriteState,
} from '@/lib/sprite';
import {
  createSpritePlaybackSnapshot,
  reconcilePlaybackSnapshot,
} from '@/lib/sprite-queue';
import type { SpriteStatePayload } from '@/types/sprite';

interface SpriteStore {
  characterId: SpriteCharacterId;
  signals: SpriteSignals;
  currentState: SpriteState;
  settledState: SpriteState;
  requestedState: SpriteState;
  transitionMode: SpriteTransitionMode;
  activeClip: SpriteClip | null;
  playbackQueue: SpriteClip[];
  queueVersion: number;
  setCharacterId: (characterId: SpriteCharacterId) => void;
  setSignals: (partial: Partial<SpriteSignals>) => void;
  setPlaybackSnapshot: (snapshot: SpritePlaybackSnapshot) => void;
  getPayload: () => SpriteStatePayload;
}

const INITIAL_STATE = deriveSpriteState(DEFAULT_SPRITE_SIGNALS);
const INITIAL_SNAPSHOT = createSpritePlaybackSnapshot(
  DEFAULT_SPRITE_CHARACTER_ID,
  INITIAL_STATE,
  INITIAL_STATE,
);

export const useSpriteStore = create<SpriteStore>((set, get) => ({
  characterId: DEFAULT_SPRITE_CHARACTER_ID,
  signals: DEFAULT_SPRITE_SIGNALS,
  currentState: INITIAL_SNAPSHOT.currentState,
  settledState: INITIAL_SNAPSHOT.settledState,
  requestedState: INITIAL_SNAPSHOT.requestedState,
  transitionMode: INITIAL_SNAPSHOT.transitionMode,
  activeClip: INITIAL_SNAPSHOT.activeClip,
  playbackQueue: INITIAL_SNAPSHOT.playbackQueue,
  queueVersion: INITIAL_SNAPSHOT.queueVersion,
  setCharacterId: (characterId) => {
    const current = get();
    const nextSnapshot = createSpritePlaybackSnapshot(
      characterId,
      current.settledState,
      current.requestedState,
      current.queueVersion + 1,
    );
    set({
      characterId,
      currentState: nextSnapshot.currentState,
      settledState: nextSnapshot.settledState,
      requestedState: nextSnapshot.requestedState,
      transitionMode: nextSnapshot.transitionMode,
      activeClip: nextSnapshot.activeClip,
      playbackQueue: nextSnapshot.playbackQueue,
      queueVersion: nextSnapshot.queueVersion,
    });
  },
  setSignals: (partial) => {
    const current = get();
    const nextSignals = { ...current.signals, ...partial };
    const requestedState = deriveSpriteState(nextSignals);
    const nextSnapshot = reconcilePlaybackSnapshot(
      {
        characterId: current.characterId,
        currentState: current.currentState,
        settledState: current.settledState,
        requestedState: current.requestedState,
        transitionMode: current.transitionMode,
        activeClip: current.activeClip,
        playbackQueue: current.playbackQueue,
        queueVersion: current.queueVersion,
      },
      requestedState,
    );

    set({
      signals: nextSignals,
      currentState: nextSnapshot.currentState,
      settledState: nextSnapshot.settledState,
      requestedState: nextSnapshot.requestedState,
      transitionMode: nextSnapshot.transitionMode,
      activeClip: nextSnapshot.activeClip,
      playbackQueue: nextSnapshot.playbackQueue,
      queueVersion: nextSnapshot.queueVersion,
    });
  },
  setPlaybackSnapshot: (snapshot) => {
    set({
      currentState: snapshot.currentState,
      settledState: snapshot.settledState,
      requestedState: snapshot.requestedState,
      transitionMode: snapshot.transitionMode,
      activeClip: snapshot.activeClip,
      playbackQueue: snapshot.playbackQueue,
      queueVersion: snapshot.queueVersion,
    });
  },
  getPayload: () => {
    const {
      activeClip,
      characterId,
      currentState,
      playbackQueue,
      queueVersion,
      requestedState,
      settledState,
      transitionMode,
    } = get();
    return buildSpritePayload({
      characterId,
      currentState,
      settledState,
      requestedState,
      transitionMode,
      activeClip,
      playbackQueue,
      queueVersion,
    });
  },
}));
