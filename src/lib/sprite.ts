import type { SpriteAssetManifest, SpriteProfile, SpriteSignals } from '@/types/sprite';
import type { SpriteCharacterId, SpriteState, SpriteStatePayload } from '@/types/sprite';

export const DEFAULT_SPRITE_CHARACTER_ID: SpriteCharacterId = 'raccoon';

const makeAsset = (state: SpriteState, motion: SpriteAssetManifest['motion']): SpriteAssetManifest => ({
  state,
  kind: 'placeholder',
  loop: state !== 'idle',
  motion,
});

export const SPRITE_PROFILES: Record<SpriteCharacterId, SpriteProfile> = {
  raccoon: {
    id: 'raccoon',
    name: 'Raccoon Sprite',
    shortName: 'Raccoon',
    description: 'A nimble guide that keeps SpriteClaw lively, warm, and alert.',
    accent: 'hsl(28 76% 58%)',
    assets: {
      idle: makeAsset('idle', 'breathe'),
      listen: makeAsset('listen', 'bob'),
      working: makeAsset('working', 'float'),
      sleep: makeAsset('sleep', 'rest'),
    },
  },
};

export const DEFAULT_SPRITE_SIGNALS: SpriteSignals = {
  inputFocused: false,
  hasDraft: false,
  sending: false,
  pendingFinal: false,
  hasStreaming: false,
  windowFocused: true,
  documentVisible: true,
};

const SPRITE_COPY: Record<SpriteState, { title: string; subtitle: string }> = {
  idle: {
    title: 'Sprite calm',
    subtitle: 'Everything is steady. Drop a task whenever you are ready.',
  },
  listen: {
    title: 'Sprite listening',
    subtitle: 'Drafting, attaching, and lining up the next move.',
  },
  working: {
    title: 'Sprite working',
    subtitle: 'Processing the next move and keeping the run in motion.',
  },
  sleep: {
    title: 'Sprite sleeping',
    subtitle: 'Quiet mode on until you come back.',
  },
};

export function getSpriteProfile(characterId: SpriteCharacterId): SpriteProfile {
  return SPRITE_PROFILES[characterId] ?? SPRITE_PROFILES[DEFAULT_SPRITE_CHARACTER_ID];
}

export function getSpriteCopy(state: SpriteState): { title: string; subtitle: string } {
  return SPRITE_COPY[state];
}

export function deriveSpriteState(signals: SpriteSignals): SpriteState {
  if (!signals.windowFocused || !signals.documentVisible) return 'sleep';
  if (signals.sending || signals.pendingFinal || signals.hasStreaming) return 'working';
  if (signals.inputFocused || signals.hasDraft) return 'listen';
  return 'idle';
}

export function buildSpritePayload(characterId: SpriteCharacterId, state: SpriteState): SpriteStatePayload {
  const copy = getSpriteCopy(state);
  return {
    characterId,
    state,
    title: copy.title,
    subtitle: copy.subtitle,
    timestamp: Date.now(),
  };
}
