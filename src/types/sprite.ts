import type { SpriteCharacterId, SpriteOverlayBounds, SpriteOverlaySettings, SpriteState, SpriteStatePayload } from '../../shared/sprite';

export type { SpriteCharacterId, SpriteOverlayBounds, SpriteOverlaySettings, SpriteState, SpriteStatePayload };

export type SpriteAssetKind = 'placeholder' | 'video';
export type SpriteAssetMotion = 'breathe' | 'bob' | 'spark' | 'float' | 'rest';

export interface SpriteAssetManifest {
  state: SpriteState;
  kind: SpriteAssetKind;
  loop: boolean;
  motion: SpriteAssetMotion;
  source?: string;
}

export interface SpriteProfile {
  id: SpriteCharacterId;
  name: string;
  shortName: string;
  description: string;
  accent: string;
  assets: Record<SpriteState, SpriteAssetManifest>;
}

export interface SpriteSignals {
  inputFocused: boolean;
  hasDraft: boolean;
  sending: boolean;
  pendingFinal: boolean;
  hasStreaming: boolean;
  windowFocused: boolean;
  documentVisible: boolean;
}
