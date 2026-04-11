import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { subscribeHostEvent } from '@/lib/host-events';
import { invokeIpc } from '@/lib/api-client';
import { SpriteStage } from '@/components/sprite/SpriteStage';
import { DEFAULT_SPRITE_CHARACTER_ID, buildSpritePayload } from '@/lib/sprite';
import type { SpriteStatePayload } from '@/types/sprite';

export function SpriteOverlayPage() {
  const [payload, setPayload] = useState<SpriteStatePayload>(() => buildSpritePayload(DEFAULT_SPRITE_CHARACTER_ID, 'idle'));

  useEffect(() => {
    const unsubscribe = subscribeHostEvent<SpriteStatePayload>('sprite:overlay-state', (next) => {
      setPayload(next);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="drag-region h-screen w-screen overflow-hidden bg-transparent p-3">
      <div className="relative h-full w-full rounded-[34px] border border-white/30 bg-[linear-gradient(180deg,rgba(255,251,235,0.92),rgba(255,247,237,0.72))] shadow-[0_20px_90px_rgba(84,52,21,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(42,35,31,0.88),rgba(22,19,19,0.76))]">
        <button
          type="button"
          data-testid="sprite-overlay-close"
          onClick={() => {
            void invokeIpc('sprite:overlayHide');
          }}
          className="no-drag absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/70 text-foreground/70 transition-colors hover:bg-white dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
          title="Hide sprite"
        >
          <X className="h-4 w-4" />
        </button>

        <button
          type="button"
          data-testid="sprite-overlay-focus-main"
          onClick={() => {
            void invokeIpc('sprite:focusMainWindow');
          }}
          className="no-drag block h-full w-full text-left"
        >
          <SpriteStage
            compact
            state={payload.state}
            characterId={payload.characterId}
            title={payload.title}
            subtitle={payload.subtitle}
            className="h-full border-0 bg-transparent shadow-none"
          />
        </button>
      </div>
    </div>
  );
}
