import { fireEvent, render, screen } from '@testing-library/react';
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

    expect(screen.getByTestId('sprite-video-front')).toHaveAttribute('data-sprite-visible', 'true');
    expect(screen.getByTestId('sprite-video-front')).toHaveAttribute('data-sprite-phase', 'enter');
    expect(screen.getByTestId('sprite-video-back')).toHaveAttribute('data-sprite-phase', 'loop');
  });

  it('advances to the next queued clip and swaps the visible layer on ended', () => {
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

    fireEvent.ended(screen.getByTestId('sprite-video-front'));

    expect(screen.getByTestId('sprite-video-back')).toHaveAttribute('data-sprite-visible', 'true');
    expect(screen.getByTestId('sprite-video-back')).toHaveAttribute('data-sprite-phase', 'loop');
    expect(screen.getByTestId('sprite-video-back')).toHaveAttribute('data-sprite-state', 'listen');
    expect(onPlaybackChange).toHaveBeenCalledTimes(1);
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

    expect(screen.getByTestId('sprite-video-front')).toHaveAttribute('data-sprite-phase', 'loop');
    expect(screen.getByTestId('sprite-video-front')).toHaveAttribute('data-sprite-state', 'sleep');
    expect(screen.getByTestId('sprite-video-back')).toHaveAttribute('data-sprite-phase', 'exit');
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

    fireEvent.ended(screen.getByTestId('sprite-video-front'));

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

    const frontVideo = screen.getByTestId('sprite-video-front');
    const backVideo = screen.getByTestId('sprite-video-back');
    const visibleVideo = frontVideo.getAttribute('data-sprite-visible') === 'true' ? frontVideo : backVideo;
    const hiddenVideo = visibleVideo === frontVideo ? backVideo : frontVideo;

    expect(visibleVideo).toHaveAttribute('data-sprite-phase', 'loop');
    expect(visibleVideo).toHaveAttribute('data-sprite-state', 'sleep');
    expect(hiddenVideo).toHaveAttribute('data-sprite-phase', 'exit');
    expect(hiddenVideo).toHaveAttribute('data-sprite-state', 'sleep');
  });
});
