import { getSpriteAsset } from '@/lib/sprite-registry';
import type {
  SpriteCharacterId,
  SpriteClip,
  SpritePlaybackSnapshot,
  SpriteState,
  SpriteTransitionMode,
} from '@/types/sprite';

function createSpriteClip(
  characterId: SpriteCharacterId,
  state: SpriteState,
  phase: SpriteClip['phase'],
): SpriteClip | null {
  const asset = getSpriteAsset(characterId, state);
  if (phase === 'loop') {
    return { src: asset.loop, state, phase };
  }
  if (phase === 'enter' && asset.enter) {
    return { src: asset.enter, state, phase };
  }
  if (phase === 'exit' && asset.exit) {
    return { src: asset.exit, state, phase };
  }
  return null;
}

function pushClip(
  clips: SpriteClip[],
  characterId: SpriteCharacterId,
  state: SpriteState,
  phase: SpriteClip['phase'],
): void {
  const clip = createSpriteClip(characterId, state, phase);
  if (clip) {
    clips.push(clip);
  }
}

export function planPath(
  characterId: SpriteCharacterId,
  fromSettledState: SpriteState,
  toRequestedState: SpriteState,
): SpriteClip[] {
  const clips: SpriteClip[] = [];

  if (fromSettledState === toRequestedState) {
    pushClip(clips, characterId, toRequestedState, 'loop');
    return clips;
  }

  if (fromSettledState !== 'idle' && toRequestedState !== 'idle') {
    pushClip(clips, characterId, fromSettledState, 'exit');
    pushClip(clips, characterId, toRequestedState, 'enter');
    pushClip(clips, characterId, toRequestedState, 'loop');
    return clips;
  }

  if (fromSettledState !== 'idle') {
    pushClip(clips, characterId, fromSettledState, 'exit');
    pushClip(clips, characterId, 'idle', 'loop');
  }

  if (toRequestedState !== 'idle') {
    pushClip(clips, characterId, toRequestedState, 'enter');
    pushClip(clips, characterId, toRequestedState, 'loop');
  }

  return clips;
}

export function buildQueueAfterActiveClip(
  characterId: SpriteCharacterId,
  activeClip: SpriteClip | null,
  requestedState: SpriteState,
): SpriteClip[] {
  if (!activeClip) {
    return planPath(characterId, requestedState, requestedState);
  }

  const fromState = activeClip.phase === 'exit' ? 'idle' : activeClip.state;
  return planPath(characterId, fromState, requestedState);
}

export function deriveTransitionMode(
  settledState: SpriteState,
  requestedState: SpriteState,
  activeClip: SpriteClip | null,
): SpriteTransitionMode {
  return activeClip?.phase === 'loop' && settledState === requestedState
    ? 'steady'
    : 'bridging';
}

export function createSpritePlaybackSnapshot(
  characterId: SpriteCharacterId,
  settledState: SpriteState,
  requestedState: SpriteState = settledState,
  queueVersion = 0,
): SpritePlaybackSnapshot {
  const path = planPath(characterId, settledState, requestedState);
  const activeClip = path[0] ?? null;
  const playbackQueue = path.slice(1);
  return {
    characterId,
    currentState: activeClip?.state ?? settledState,
    settledState,
    requestedState,
    transitionMode: deriveTransitionMode(settledState, requestedState, activeClip),
    activeClip,
    playbackQueue,
    queueVersion,
  };
}

export function reconcilePlaybackSnapshot(
  snapshot: SpritePlaybackSnapshot,
  requestedState: SpriteState,
): SpritePlaybackSnapshot {
  if (requestedState === snapshot.requestedState) {
    return snapshot;
  }

  const playbackQueue = buildQueueAfterActiveClip(
    snapshot.characterId,
    snapshot.activeClip,
    requestedState,
  );

  return {
    ...snapshot,
    requestedState,
    playbackQueue,
    transitionMode: deriveTransitionMode(
      snapshot.settledState,
      requestedState,
      snapshot.activeClip,
    ),
    queueVersion: snapshot.queueVersion + 1,
  };
}

export function advancePlaybackSnapshot(
  snapshot: SpritePlaybackSnapshot,
): SpritePlaybackSnapshot {
  const nextActiveClip = snapshot.playbackQueue[0] ?? null;
  const remainingQueue = snapshot.playbackQueue.slice(1);
  const nextSettledState =
    nextActiveClip?.phase === 'loop' ? nextActiveClip.state : snapshot.settledState;
  const nextQueue = nextActiveClip
    ? remainingQueue.length > 0
      ? remainingQueue
      : buildQueueAfterActiveClip(snapshot.characterId, nextActiveClip, snapshot.requestedState)
    : [];

  return {
    ...snapshot,
    currentState: nextActiveClip?.state ?? snapshot.currentState,
    settledState: nextSettledState,
    activeClip: nextActiveClip,
    playbackQueue: nextQueue,
    transitionMode: deriveTransitionMode(nextSettledState, snapshot.requestedState, nextActiveClip),
    queueVersion: snapshot.queueVersion + 1,
  };
}
