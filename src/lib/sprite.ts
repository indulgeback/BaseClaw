import type { SpriteAssetManifest, SpriteProfile, SpriteSignals } from '@/types/sprite';
import type { SpriteCharacterId, SpriteState, SpriteStatePayload } from '@/types/sprite';

export const DEFAULT_SPRITE_CHARACTER_ID: SpriteCharacterId = 'raccoon';

const makeAsset = (state: SpriteState, motion: SpriteAssetManifest['motion']): SpriteAssetManifest => ({
  state,
  kind: 'placeholder',
  loop: state !== 'success' && state !== 'error',
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
      welcome: makeAsset('welcome', 'spark'),
      idle: makeAsset('idle', 'breathe'),
      listening: makeAsset('listening', 'bob'),
      thinking: makeAsset('thinking', 'float'),
      responding: makeAsset('responding', 'spark'),
      success: makeAsset('success', 'spark'),
      error: makeAsset('error', 'bob'),
      sleeping: makeAsset('sleeping', 'rest'),
    },
  },
};

export const DEFAULT_SPRITE_SIGNALS: SpriteSignals = {
  isWelcome: true,
  inputFocused: false,
  hasDraft: false,
  sending: false,
  pendingFinal: false,
  hasStreaming: false,
  windowFocused: true,
  documentVisible: true,
};

const SPRITE_COPY: Record<SpriteState, { title: string; subtitle: string }> = {
  welcome: {
    title: 'Sprite awake',
    subtitle: 'Your raccoon guide is ready to start a fresh run.',
  },
  idle: {
    title: 'Sprite calm',
    subtitle: 'Everything is steady. Drop a task whenever you are ready.',
  },
  listening: {
    title: 'Sprite listening',
    subtitle: 'Drafting, attaching, and lining up the next move.',
  },
  thinking: {
    title: 'Sprite thinking',
    subtitle: 'Collecting clues, tools, and next-step intent.',
  },
  responding: {
    title: 'Sprite responding',
    subtitle: 'The answer is taking shape right now.',
  },
  success: {
    title: 'Sprite delighted',
    subtitle: 'That run landed cleanly.',
  },
  error: {
    title: 'Sprite concerned',
    subtitle: 'Something drifted. Let us steady the flow.',
  },
  sleeping: {
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
  if (!signals.windowFocused || !signals.documentVisible) return 'sleeping';
  if (signals.isWelcome) return 'welcome';
  if (signals.sending && signals.hasStreaming) return 'responding';
  if (signals.sending || signals.pendingFinal) return 'thinking';
  if (signals.inputFocused || signals.hasDraft) return 'listening';
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
