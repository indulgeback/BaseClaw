import { Sparkles, MoonStar, Waves, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpriteCharacterId, SpriteClip, SpritePlaybackSnapshot, SpriteState } from '@/types/sprite';
import { SpriteVideoPlayer } from './SpriteVideoPlayer';

const STATE_BADGE_ICON: Record<SpriteState, typeof Sparkles> = {
  idle: Bot,
  listen: Waves,
  working: Sparkles,
  sleep: MoonStar,
};

export function SpriteStage({
  state,
  settledState,
  characterId,
  requestedState,
  activeClip,
  playbackQueue,
  queueVersion,
  compact = false,
  className,
  title,
  subtitle,
  onPlaybackChange,
}: {
  state: SpriteState;
  settledState?: SpriteState;
  characterId: SpriteCharacterId;
  requestedState?: SpriteState;
  activeClip?: SpriteClip | null;
  playbackQueue?: SpriteClip[];
  queueVersion?: number;
  compact?: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
  onPlaybackChange?: (snapshot: SpritePlaybackSnapshot) => void;
}) {
  void title;
  void subtitle;
  void STATE_BADGE_ICON[state];

  return (
    <section
      data-testid={compact ? 'sprite-stage-compact' : 'sprite-stage'}
      data-sprite-state={state}
      data-sprite-settled-state={settledState ?? state}
      data-sprite-requested-state={requestedState ?? state}
      data-sprite-active-phase={activeClip?.phase ?? 'none'}
      data-sprite-active-state={activeClip?.state ?? 'none'}
      data-sprite-queue-head-phase={playbackQueue?.[0]?.phase ?? 'none'}
      data-sprite-queue-head-state={playbackQueue?.[0]?.state ?? 'none'}
      data-sprite-queue-version={String(queueVersion ?? 0)}
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-transparent',
        compact ? 'h-[240px] w-[240px]' : 'h-[180px] w-[180px]',
        className
      )}
    >
      <SpriteVideoPlayer
        characterId={characterId}
        currentState={state}
        settledState={settledState ?? state}
        requestedState={requestedState ?? state}
        activeClip={activeClip ?? null}
        playbackQueue={playbackQueue ?? []}
        queueVersion={queueVersion ?? 0}
        compact={compact}
        onPlaybackChange={onPlaybackChange}
      />
    </section>
  );
}
