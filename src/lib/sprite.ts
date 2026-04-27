import type { SpriteClip, SpritePlaybackSnapshot, SpriteSignals } from '@/types/sprite';
import type { SpriteCharacterId, SpriteState, SpriteStatePayload } from '@/types/sprite';
import { createSpritePlaybackSnapshot, planPath } from './sprite-queue';
import {
  DEFAULT_SPRITE_CHARACTER_ID,
  DEFAULT_SPRITE_SIGNALS,
  getSpriteAsset,
  getSpriteCopy,
  getSpriteProfile,
  SPRITE_PROFILES,
} from './sprite-registry';

export {
  DEFAULT_SPRITE_CHARACTER_ID,
  DEFAULT_SPRITE_SIGNALS,
  getSpriteAsset,
  getSpriteCopy,
  getSpriteProfile,
  SPRITE_PROFILES,
};

export type SpriteClipSequenceItem = SpriteClip;

export function buildSpriteSequence(
  characterId: SpriteCharacterId,
  settledState: SpriteState,
  requestedState: SpriteState,
): SpriteClipSequenceItem[] {
  return planPath(characterId, settledState, requestedState);
}

export function deriveSpriteState(signals: SpriteSignals): SpriteState {
  if (!signals.documentVisible) return 'sleep';
  if (signals.sending || signals.pendingFinal || signals.hasStreaming) return 'working';
  if (!signals.windowFocused) return 'sleep';
  if (signals.inputFocused || signals.hasDraft) return 'listen';
  return 'idle';
}

export function buildSpritePayload(snapshot: SpritePlaybackSnapshot): SpriteStatePayload {
  const copy = getSpriteCopy(snapshot.currentState);
  return {
    characterId: snapshot.characterId,
    state: snapshot.currentState,
    settledState: snapshot.settledState,
    requestedState: snapshot.requestedState,
    transitionMode: snapshot.transitionMode,
    activeClip: snapshot.activeClip,
    playbackQueue: snapshot.playbackQueue,
    queueVersion: snapshot.queueVersion,
    title: copy.title,
    subtitle: copy.subtitle,
    timestamp: Date.now(),
  };
}

export function createInitialSpritePayload(
  characterId: SpriteCharacterId,
  settledState: SpriteState = 'idle',
  requestedState: SpriteState = settledState,
): SpriteStatePayload {
  return buildSpritePayload(
    createSpritePlaybackSnapshot(characterId, settledState, requestedState),
  );
}
