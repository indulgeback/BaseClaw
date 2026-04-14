import { useEffect, useMemo, useRef, useState } from 'react';
import {
  advancePlaybackSnapshot,
  createSpritePlaybackSnapshot,
  reconcilePlaybackSnapshot,
} from '@/lib/sprite-queue';
import type {
  SpriteCharacterId,
  SpriteClip,
  SpritePlaybackSnapshot,
  SpriteState,
} from '@/types/sprite';
import { SpriteAvatar } from './SpriteAvatar';

function clipKey(clip: SpriteClip | null): string {
  return clip ? `${clip.src}|${clip.state}|${clip.phase}` : 'none';
}

function queueKey(queue: SpriteClip[]): string {
  return queue.map((clip) => clipKey(clip)).join('>');
}

function normalizePlaybackSnapshot(input: {
  characterId: SpriteCharacterId;
  currentState: SpriteState;
  settledState: SpriteState;
  requestedState: SpriteState;
  activeClip: SpriteClip | null;
  playbackQueue: SpriteClip[];
  queueVersion: number;
}): SpritePlaybackSnapshot {
  if (input.activeClip) {
    return {
      characterId: input.characterId,
      currentState: input.currentState,
      settledState: input.settledState,
      requestedState: input.requestedState,
      transitionMode:
        input.activeClip.phase === 'loop' && input.settledState === input.requestedState
          ? 'steady'
          : 'bridging',
      activeClip: input.activeClip,
      playbackQueue: input.playbackQueue,
      queueVersion: input.queueVersion,
    };
  }

  return createSpritePlaybackSnapshot(
    input.characterId,
    input.settledState,
    input.requestedState,
    input.queueVersion
  );
}

function isEquivalentPlayback(
  left: SpritePlaybackSnapshot,
  right: SpritePlaybackSnapshot
): boolean {
  return (
    left.characterId === right.characterId &&
    left.currentState === right.currentState &&
    left.settledState === right.settledState &&
    left.requestedState === right.requestedState &&
    clipKey(left.activeClip) === clipKey(right.activeClip) &&
    queueKey(left.playbackQueue) === queueKey(right.playbackQueue)
  );
}

function mergeIncomingPlayback(
  current: SpritePlaybackSnapshot,
  incoming: SpritePlaybackSnapshot
): SpritePlaybackSnapshot {
  if (current.characterId !== incoming.characterId) {
    return incoming;
  }

  if (incoming.queueVersion > current.queueVersion) {
    return incoming;
  }

  if (incoming.requestedState !== current.requestedState) {
    return reconcilePlaybackSnapshot(current, incoming.requestedState);
  }

  return current;
}

export function SpriteVideoPlayer({
  characterId,
  currentState,
  settledState,
  requestedState,
  activeClip,
  playbackQueue,
  queueVersion,
  compact = false,
  onPlaybackChange,
}: {
  characterId: SpriteCharacterId;
  currentState: SpriteState;
  settledState: SpriteState;
  requestedState: SpriteState;
  activeClip: SpriteClip | null;
  playbackQueue: SpriteClip[];
  queueVersion: number;
  compact?: boolean;
  onPlaybackChange?: (snapshot: SpritePlaybackSnapshot) => void;
}) {
  const frontRef = useRef<HTMLVideoElement | null>(null);
  const backRef = useRef<HTMLVideoElement | null>(null);
  const incomingPlayback = useMemo(
    () =>
      normalizePlaybackSnapshot({
        characterId,
        currentState,
        settledState,
        requestedState,
        activeClip,
        playbackQueue,
        queueVersion,
      }),
    [
      activeClip,
      characterId,
      currentState,
      playbackQueue,
      queueVersion,
      requestedState,
      settledState,
    ]
  );
  const [playback, setPlayback] = useState<SpritePlaybackSnapshot>(incomingPlayback);
  const playbackRef = useRef<SpritePlaybackSnapshot>(incomingPlayback);
  const [visibleLayer, setVisibleLayer] = useState<'front' | 'back'>('front');
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  useEffect(() => {
    setPlayback((current) => {
      const nextPlayback = isEquivalentPlayback(current, incomingPlayback)
        ? current
        : mergeIncomingPlayback(current, incomingPlayback);

      if (isEquivalentPlayback(current, nextPlayback)) {
        return current;
      }
      playbackRef.current = nextPlayback;
      return nextPlayback;
    });
  }, [incomingPlayback]);

  const visibleClip = playback.activeClip;
  const hiddenClip = playback.playbackQueue[0] ?? null;
  const visibleRef = visibleLayer === 'front' ? frontRef : backRef;
  const hiddenRef = visibleLayer === 'front' ? backRef : frontRef;
  const frontClip = visibleLayer === 'front' ? visibleClip : hiddenClip;
  const backClip = visibleLayer === 'back' ? visibleClip : hiddenClip;
  const sizeClasses = compact ? 'h-[240px] w-[240px]' : 'h-[180px] w-[180px]';
  const fallbackState = useMemo(
    () => requestedState || settledState,
    [requestedState, settledState]
  );
  const visibleClipKey = clipKey(visibleClip);
  const hiddenClipKey = clipKey(hiddenClip);

  useEffect(() => {
    if (!visibleClip || !visibleRef.current) return;
    const video = visibleRef.current;
    video.currentTime = 0;
    void video.play().catch(() => {});
  }, [visibleClipKey, visibleLayer, visibleRef, visibleClip]);

  useEffect(() => {
    if (!hiddenClip || !hiddenRef.current) return;
    hiddenRef.current.currentTime = 0;
    hiddenRef.current.load();
  }, [hiddenClip, hiddenClipKey, hiddenRef, visibleLayer]);

  const handleEnded = () => {
    const nextPlayback = advancePlaybackSnapshot(playbackRef.current);
    if (!nextPlayback.activeClip) {
      return;
    }

    playbackRef.current = nextPlayback;
    setPlayback(nextPlayback);
    setVisibleLayer((current) => (current === 'front' ? 'back' : 'front'));
    onPlaybackChange?.(nextPlayback);
  };

  if (!visibleClip || videoFailed) {
    return <SpriteAvatar state={fallbackState} compact={compact} />;
  }

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses}`}>
      <video
        ref={frontRef}
        src={frontClip?.src}
        data-testid="sprite-video-front"
        data-sprite-phase={frontClip?.phase ?? 'none'}
        data-sprite-state={frontClip?.state ?? 'none'}
        data-sprite-visible={visibleLayer === 'front' ? 'true' : 'false'}
        className={`absolute h-full w-full object-contain ${visibleLayer === 'front' ? 'opacity-100' : 'opacity-0'}`}
        muted
        playsInline
        preload="auto"
        onEnded={visibleLayer === 'front' ? handleEnded : undefined}
        onError={() => setVideoFailed(true)}
      />
      <video
        ref={backRef}
        src={backClip?.src}
        data-testid="sprite-video-back"
        data-sprite-phase={backClip?.phase ?? 'none'}
        data-sprite-state={backClip?.state ?? 'none'}
        data-sprite-visible={visibleLayer === 'back' ? 'true' : 'false'}
        className={`absolute h-full w-full object-contain ${visibleLayer === 'back' ? 'opacity-100' : 'opacity-0'}`}
        muted
        playsInline
        preload="auto"
        onEnded={visibleLayer === 'back' ? handleEnded : undefined}
        onError={() => setVideoFailed(true)}
      />
    </div>
  );
}
