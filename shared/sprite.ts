export const SPRITE_CHARACTER_IDS = ['raccoon'] as const;
export type SpriteCharacterId = (typeof SPRITE_CHARACTER_IDS)[number];

export const SPRITE_STATES = [
  'welcome',
  'idle',
  'listening',
  'thinking',
  'responding',
  'success',
  'error',
  'sleeping',
] as const;
export type SpriteState = (typeof SPRITE_STATES)[number];

export interface SpriteOverlayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteOverlaySettings {
  enabled: boolean;
  visible: boolean;
  supported: boolean;
  bounds: SpriteOverlayBounds | null;
}

export interface SpriteStatePayload {
  characterId: SpriteCharacterId;
  state: SpriteState;
  title: string;
  subtitle: string;
  timestamp: number;
}

export function supportsSpriteOverlayPlatform(platform: NodeJS.Platform): boolean {
  return platform === 'darwin' || platform === 'win32';
}

export function isSpriteState(value: string): value is SpriteState {
  return (SPRITE_STATES as readonly string[]).includes(value);
}

export function isSpriteCharacterId(value: string): value is SpriteCharacterId {
  return (SPRITE_CHARACTER_IDS as readonly string[]).includes(value);
}
