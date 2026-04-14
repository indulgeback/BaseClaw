import type {
  SpriteCharacterId,
  SpriteClipPhase,
  SpriteClipSnapshot,
  SpriteOverlayBounds,
  SpriteOverlaySettings,
  SpriteState,
  SpriteStatePayload,
  SpriteTransitionMode,
} from '../../shared/sprite';

export type {
  SpriteCharacterId,
  SpriteClipPhase,
  SpriteClipSnapshot,
  SpriteOverlayBounds,
  SpriteOverlaySettings,
  SpriteState,
  SpriteStatePayload,
  SpriteTransitionMode,
};

export interface SpriteAssetManifest {
  state: SpriteState;
  loop: string;
  enter?: string;
  exit?: string;
}

export interface SpriteClip extends SpriteClipSnapshot {}

export interface SpritePlaybackSnapshot {
  characterId: SpriteCharacterId;
  currentState: SpriteState;
  settledState: SpriteState;
  requestedState: SpriteState;
  transitionMode: SpriteTransitionMode;
  activeClip: SpriteClip | null;
  playbackQueue: SpriteClip[];
  queueVersion: number;
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
