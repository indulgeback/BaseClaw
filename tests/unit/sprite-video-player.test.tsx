import { fireEvent, render, screen, act } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { reconcilePlaybackSnapshot, createSpritePlaybackSnapshot } from '@/lib/sprite-queue';
import { SpriteVideoPlayer } from '@/components/sprite/SpriteVideoPlayer';

beforeAll(() => {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'load', {
    configurable: true,
    value: vi.fn(),
  });
});

describe('sprite video player queue execution', () => {
  it('keeps the active clip visible and preloads the next queued clip', () => {
    const snapshot = createSpritePlaybackSnapshot('raccoon', 'idle', 'listen');

    render(
      <SpriteVideoPlayer
        characterId={snapshot.characterId}
        currentState={snapshot.currentState}
        settledState={snapshot.settledState}
        requestedState={snapshot.requestedState}
        activeClip={snapshot.activeClip}
        playbackQueue={snapshot.playbackQueue}
        queueVersion={snapshot.queueVersion}
      />,
    );

    expect(screen.getByTestId('sprite-video-a')).toHaveAttribute('data-sprite-visible', 'true');
    expect(screen.getByTestId('sprite-video-a')).toHaveAttribute('data-sprite-phase', 'enter');
    expect(screen.getByTestId('sprite-video-b')).toHaveAttribute('data-sprite-phase', 'loop');
  });

  it('crossfades to the next queued clip on ended', () => {
    vi.useFakeTimers();

    const snapshot = createSpritePlaybackSnapshot('raccoon', 'idle', 'listen');
    const onPlaybackChange = vi.fn();

    render(
      <SpriteVideoPlayer
        characterId={snapshot.characterId}
        currentState={snapshot.currentState}
        settledState={snapshot.settledState}
        requestedState={snapshot.requestedState}
        activeClip={snapshot.activeClip}
        playbackQueue={snapshot.playbackQueue}
        queueVersion={snapshot.queueVersion}
        onPlaybackChange={onPlaybackChange}
      />,
    );

    // Fire ended on the active video (A) → triggers crossfade to buffer (B)
    fireEvent.ended(screen.getByTestId('sprite-video-a'));

    // Simulate canplaythrough on the buffer video so the crossfade starts
    act(() => {
      screen.getByTestId('sprite-video-b').dispatchEvent(new Event('canplaythrough'));
    });

    // Advance past the crossfade transition duration
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // B should now be the active video
    expect(screen.getByTestId('sprite-video-a')).toHaveAttribute('data-sprite-visible', 'false');
    expect(screen.getByTestId('sprite-video-b')).toHaveAttribute('data-sprite-visible', 'true');
    expect(screen.getByTestId('sprite-video-b')).toHaveAttribute('data-sprite-phase', 'loop');
    expect(screen.getByTestId('sprite-video-b')).toHaveAttribute('data-sprite-state', 'listen');
    expect(onPlaybackChange).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('updates future queue without restarting the active clip when only the requested state changes', () => {
    const sleeping = createSpritePlaybackSnapshot('raccoon', 'sleep', 'sleep');
    const waking = reconcilePlaybackSnapshot(sleeping, 'idle');

    const { rerender } = render(
      <SpriteVideoPlayer
        characterId={sleeping.characterId}
        currentState={sleeping.currentState}
        settledState={sleeping.settledState}
        requestedState={sleeping.requestedState}
        activeClip={sleeping.activeClip}
        playbackQueue={sleeping.playbackQueue}
        queueVersion={sleeping.queueVersion}
      />,
    );

    rerender(
      <SpriteVideoPlayer
        characterId={waking.characterId}
        currentState={waking.currentState}
        settledState={waking.settledState}
        requestedState={waking.requestedState}
        activeClip={waking.activeClip}
        playbackQueue={waking.playbackQueue}
        queueVersion={waking.queueVersion}
      />,
    );

    // Active clip should still show sleep loop (crossfade is async, hasn't completed)
    expect(screen.getByTestId('sprite-video-a')).toHaveAttribute('data-sprite-phase', 'loop');
    expect(screen.getByTestId('sprite-video-a')).toHaveAttribute('data-sprite-state', 'sleep');
    // Buffer should show the next queued clip (sleep exit)
    expect(screen.getByTestId('sprite-video-b')).toHaveAttribute('data-sprite-phase', 'exit');
  });

  it('keeps locally advanced sleep playback when a stale incoming snapshot requests idle', () => {
    const sleeping = createSpritePlaybackSnapshot('raccoon', 'sleep', 'sleep', 2);
    const { rerender } = render(
      <SpriteVideoPlayer
        characterId={sleeping.characterId}
        currentState={sleeping.currentState}
        settledState={sleeping.settledState}
        requestedState={sleeping.requestedState}
        activeClip={sleeping.activeClip}
        playbackQueue={sleeping.playbackQueue}
        queueVersion={sleeping.queueVersion}
      />,
    );

    // Sleep loop has no queue → advance returns null → no crossfade
    fireEvent.ended(screen.getByTestId('sprite-video-a'));

    const staleWakeRequest = {
      ...reconcilePlaybackSnapshot(sleeping, 'idle'),
      queueVersion: 2,
    };
    rerender(
      <SpriteVideoPlayer
        characterId={staleWakeRequest.characterId}
        currentState={staleWakeRequest.currentState}
        settledState={staleWakeRequest.settledState}
        requestedState={staleWakeRequest.requestedState}
        activeClip={staleWakeRequest.activeClip}
        playbackQueue={staleWakeRequest.playbackQueue}
        queueVersion={staleWakeRequest.queueVersion}
      />,
    );

    const videoA = screen.getByTestId('sprite-video-a');
    const videoB = screen.getByTestId('sprite-video-b');
    const visibleVideo = videoA.getAttribute('data-sprite-visible') === 'true' ? videoA : videoB;
    const hiddenVideo = visibleVideo === videoA ? videoB : videoA;

    expect(visibleVideo).toHaveAttribute('data-sprite-phase', 'loop');
    expect(visibleVideo).toHaveAttribute('data-sprite-state', 'sleep');
    expect(hiddenVideo).toHaveAttribute('data-sprite-phase', 'exit');
    expect(hiddenVideo).toHaveAttribute('data-sprite-state', 'sleep');
  });
});
