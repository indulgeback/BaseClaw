import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  advancePlaybackSnapshot,
  buildQueueAfterActiveClip,
  createSpritePlaybackSnapshot,
  deriveTransitionMode,
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
  return queue.map((c) => clipKey(c)).join('>');
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

/** Crossfade transition duration – must match the CSS `transition-duration`. */
const CROSSFADE_MS = 700;
/** Fallback timeout when `canplaythrough` never fires. */
const FALLBACK_TIMEOUT_MS = 5000;

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
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);

  const activeSideRef = useRef<'A' | 'B'>('A');
  const isSwitchingRef = useRef(false);
  const aliveRef = useRef(true);
  const initializedRef = useRef(false);

  const [activeSide, setActiveSide] = useState<'A' | 'B'>('A');
  const [videoFailed, setVideoFailed] = useState(false);

  const onPlaybackChangeRef = useRef(onPlaybackChange);
  useEffect(() => {
    onPlaybackChangeRef.current = onPlaybackChange;
  }, [onPlaybackChange]);

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

  const sizeClasses = compact ? 'h-[240px] w-[240px]' : 'h-[180px] w-[180px]';
  const fallbackState = useMemo(
    () => requestedState || settledState,
    [requestedState, settledState]
  );

  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // ── Crossfade engine ─────────────────────────────────
  const crossfadeTo = useCallback((nextPlayback: SpritePlaybackSnapshot) => {
    if (isSwitchingRef.current || !nextPlayback.activeClip) return;

    const nextClip = nextPlayback.activeClip;
    const side = activeSideRef.current;
    const activeVideo = side === 'A' ? videoARef.current : videoBRef.current;
    const bufferVideo = side === 'A' ? videoBRef.current : videoARef.current;

    if (!bufferVideo) return;

    isSwitchingRef.current = true;

    // Load next clip into the hidden buffer video
    bufferVideo.src = nextClip.src;
    bufferVideo.currentTime = 0;
    bufferVideo.loop = nextClip.phase === 'loop';
    bufferVideo.load();

    const onReady = () => {
      bufferVideo.removeEventListener('canplaythrough', onReady);
      bufferVideo.removeEventListener('error', onError);

      bufferVideo.play().catch(() => {});

      // Swap opacities – CSS transition handles the smooth fade
      bufferVideo.style.opacity = '1';
      if (activeVideo) activeVideo.style.opacity = '0';

      // After the CSS transition finishes, clean up and swap roles
      setTimeout(() => {
        if (!aliveRef.current) return;

        // Release the old active video
        if (activeVideo) {
          activeVideo.pause();
          activeVideo.removeAttribute('src');
          activeVideo.load();
        }

        const newSide = side === 'A' ? 'B' : 'A';
        activeSideRef.current = newSide;
        setActiveSide(newSide);
        isSwitchingRef.current = false;

        // Use a functional update so concurrent queue changes during crossfade aren't lost
        setPlayback((current) => {
          if (current.queueVersion > nextPlayback.queueVersion) {
            const newActiveClip = nextPlayback.activeClip;
            const newQueue = buildQueueAfterActiveClip(
              current.characterId,
              newActiveClip,
              current.requestedState
            );
            const newSettled =
              newActiveClip?.phase === 'loop' ? newActiveClip.state : nextPlayback.settledState;
            const updated: SpritePlaybackSnapshot = {
              characterId: current.characterId,
              currentState: newActiveClip?.state ?? current.currentState,
              settledState: newSettled,
              requestedState: current.requestedState,
              transitionMode: deriveTransitionMode(
                newSettled,
                current.requestedState,
                newActiveClip
              ),
              activeClip: newActiveClip,
              playbackQueue: newQueue,
              queueVersion: current.queueVersion + 1,
            };
            playbackRef.current = updated;
            return updated;
          }

          playbackRef.current = nextPlayback;
          return nextPlayback;
        });

        onPlaybackChangeRef.current?.(playbackRef.current);
      }, CROSSFADE_MS);
    };

    const onError = () => {
      bufferVideo.removeEventListener('canplaythrough', onReady);
      bufferVideo.removeEventListener('error', onError);
      isSwitchingRef.current = false;
    };

    bufferVideo.addEventListener('canplaythrough', onReady, { once: true });
    bufferVideo.addEventListener('error', onError, { once: true });

    // Fallback: force the switch if canplaythrough never fires
    setTimeout(() => {
      if (isSwitchingRef.current) {
        bufferVideo.dispatchEvent(new Event('canplaythrough'));
      }
    }, FALLBACK_TIMEOUT_MS);
  }, []);

  // ── Non-loop clip ended → advance and crossfade ──────
  const handleEnded = useCallback(() => {
    if (isSwitchingRef.current) return;

    const next = advancePlaybackSnapshot(playbackRef.current);
    if (!next.activeClip) return;

    crossfadeTo(next);
  }, [crossfadeTo]);

  // ── Merge incoming playback changes ──────────────────
  useEffect(() => {
    setPlayback((current) => {
      const next = isEquivalentPlayback(current, incomingPlayback)
        ? current
        : mergeIncomingPlayback(current, incomingPlayback);

      if (isEquivalentPlayback(current, next)) return current;

      playbackRef.current = next;
      return next;
    });
  }, [incomingPlayback]);

  // ── State change while looping → force crossfade ─────
  const prevRequestedRef = useRef(playback.requestedState);

  useEffect(() => {
    const prev = prevRequestedRef.current;
    prevRequestedRef.current = playback.requestedState;

    if (
      prev !== playback.requestedState &&
      playback.activeClip?.phase === 'loop' &&
      playback.playbackQueue.length > 0 &&
      !isSwitchingRef.current
    ) {
      const next = advancePlaybackSnapshot(playback);
      if (next.activeClip) {
        crossfadeTo(next);
      }
    }
  }, [playback, crossfadeTo]);

  // ── Initial load on mount ────────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const clip = playbackRef.current.activeClip;
    const video = videoARef.current;
    if (!clip || !video) return;

    video.src = clip.src;
    video.loop = clip.phase === 'loop';
    video.style.opacity = '1';
    void video.play().catch(() => {});

    if (videoBRef.current) {
      videoBRef.current.style.opacity = '0';
    }
  }, []);

  if (!playback.activeClip || videoFailed) {
    return <SpriteAvatar state={fallbackState} compact={compact} />;
  }

  const activeClipInfo = playback.activeClip;
  const nextClipInfo = playback.playbackQueue[0] ?? null;
  const videoAClip = activeSide === 'A' ? activeClipInfo : nextClipInfo;
  const videoBClip = activeSide === 'B' ? activeClipInfo : nextClipInfo;

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses}`}>
      <video
        ref={videoARef}
        data-testid="sprite-video-a"
        data-sprite-visible={activeSide === 'A' ? 'true' : 'false'}
        data-sprite-phase={videoAClip?.phase ?? 'none'}
        data-sprite-state={videoAClip?.state ?? 'none'}
        className="absolute h-full w-full object-contain transition-opacity duration-700 ease-in-out"
        muted
        playsInline
        preload="auto"
        onEnded={handleEnded}
        onError={() => setVideoFailed(true)}
      />
      <video
        ref={videoBRef}
        data-testid="sprite-video-b"
        data-sprite-visible={activeSide === 'B' ? 'true' : 'false'}
        data-sprite-phase={videoBClip?.phase ?? 'none'}
        data-sprite-state={videoBClip?.state ?? 'none'}
        className="absolute h-full w-full object-contain transition-opacity duration-700 ease-in-out"
        muted
        playsInline
        preload="auto"
        onEnded={handleEnded}
        onError={() => setVideoFailed(true)}
      />
    </div>
  );
}
