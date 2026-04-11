import { Sparkles, MoonStar, Waves, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSpriteCopy, getSpriteProfile } from '@/lib/sprite';
import type { SpriteCharacterId, SpriteState } from '@/types/sprite';
import { SpriteAvatar } from './SpriteAvatar';

const STATE_BADGE_ICON: Record<SpriteState, typeof Sparkles> = {
  welcome: Sparkles,
  idle: Bot,
  listening: Waves,
  thinking: Sparkles,
  responding: Sparkles,
  success: Sparkles,
  error: Bot,
  sleeping: MoonStar,
};

export function SpriteStage({
  state,
  characterId,
  compact = false,
  className,
  title,
  subtitle,
}: {
  state: SpriteState;
  characterId: SpriteCharacterId;
  compact?: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
}) {
  const profile = getSpriteProfile(characterId);
  const copy = getSpriteCopy(state);
  const Icon = STATE_BADGE_ICON[state];

  return (
    <section
      data-testid={compact ? 'sprite-stage-compact' : 'sprite-stage'}
      className={cn(
        'relative overflow-hidden rounded-[32px] border border-black/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.82),rgba(255,255,255,0.48)_52%,rgba(255,255,255,0.3)_100%)] p-5 shadow-[0_18px_70px_rgba(119,74,29,0.12)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,rgba(47,40,35,0.9),rgba(28,24,23,0.96)_70%)]',
        compact ? 'h-full min-h-[260px] p-4' : 'min-h-[420px]',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(254,215,170,0.34),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(190,242,100,0.18),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(163,230,53,0.08),transparent_30%)]" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-foreground/45">
              SpriteClaw Spirit
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {title ?? copy.title}
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-3 py-1 text-[11px] font-medium text-foreground/70 dark:border-white/10 dark:bg-white/5 dark:text-foreground/80">
            <Icon className="h-3.5 w-3.5" />
            {state}
          </span>
        </div>

        <div className={cn('flex flex-1 items-center justify-center', compact ? 'py-2' : 'py-4')}>
          <SpriteAvatar state={state} compact={compact} />
        </div>

        <div className="space-y-3">
          <p className="text-sm leading-6 text-foreground/72">
            {subtitle ?? copy.subtitle}
          </p>
          <div className="rounded-2xl border border-black/10 bg-white/55 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-foreground/45">
                  Character
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {profile.shortName}
                </p>
              </div>
              <div
                className="h-9 w-9 rounded-full border border-white/50 shadow-inner"
                style={{ background: `linear-gradient(135deg, ${profile.accent}, rgba(255,255,255,0.92))` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
