import { useCallback, useEffect, useState } from 'react';
import { subscribeHostEvent } from '@/lib/host-events';
import { invokeIpc } from '@/lib/api-client';
import { SpriteStage } from '@/components/sprite/SpriteStage';
import { DEFAULT_SPRITE_CHARACTER_ID, createInitialSpritePayload } from '@/lib/sprite';
import type { SpriteStatePayload } from '@/types/sprite';

export function SpriteOverlayPage() {
  const [payload, setPayload] = useState<SpriteStatePayload>(() =>
    createInitialSpritePayload(DEFAULT_SPRITE_CHARACTER_ID, 'idle'),
  );

  useEffect(() => {
    document.body.classList.add('sprite-transparent-surface');
    return () => {
      document.body.classList.remove('sprite-transparent-surface');
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeHostEvent<SpriteStatePayload>('sprite:overlay-state', (next) => {
      setPayload(next);
    });
    return unsubscribe;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    void invokeIpc('sprite:overlayDragStart', e.screenX, e.screenY);

    const onGlobalMouseUp = () => {
      document.removeEventListener('mouseup', onGlobalMouseUp);
      void invokeIpc('sprite:overlayDragEnd');
    };
    document.addEventListener('mouseup', onGlobalMouseUp);
  }, []);

  return (
    <div
      onMouseDown={handleMouseDown}
      className="select-none cursor-default flex h-[240px] w-[240px] items-center justify-center overflow-hidden bg-transparent"
    >
      <SpriteStage
        compact
        state={payload.state}
        settledState={payload.settledState}
        characterId={payload.characterId}
        requestedState={payload.requestedState}
        activeClip={payload.activeClip}
        playbackQueue={payload.playbackQueue}
        queueVersion={payload.queueVersion}
        title={payload.title}
        subtitle={payload.subtitle}
      />
    </div>
  );
}
