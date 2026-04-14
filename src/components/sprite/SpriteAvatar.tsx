import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { SpriteState } from '@/types/sprite';

const STATE_ACCENTS: Record<SpriteState, string> = {
  idle: 'from-orange-200 via-amber-200 to-lime-200',
  listen: 'from-sky-200 via-cyan-200 to-emerald-200',
  working: 'from-fuchsia-200 via-violet-200 to-sky-200',
  sleep: 'from-slate-200 via-slate-300 to-indigo-200',
};

const STATE_RING: Record<SpriteState, string> = {
  idle: 'rgba(249, 115, 22, 0.28)',
  listen: 'rgba(34, 211, 238, 0.32)',
  working: 'rgba(168, 85, 247, 0.32)',
  sleep: 'rgba(100, 116, 139, 0.26)',
};

export function SpriteAvatar({
  state,
  compact = false,
}: {
  state: SpriteState;
  compact?: boolean;
}) {
  const sizeClasses = compact ? 'h-52 w-52' : 'h-56 w-56';
  const faceSize = compact ? 'h-36 w-36' : 'h-36 w-36';
  const eyeClass = state === 'sleep' ? 'h-0.5 w-3 rounded-full bg-slate-800/80' : 'h-3 w-3 rounded-full bg-slate-900';
  const bobY = state === 'sleep' ? [0, 2, 0] : [0, -6, 0];
  const bobDuration = state === 'working' ? 2.1 : state === 'listen' ? 2.4 : 3.2;

  return (
    <div className={cn('relative flex items-center justify-center', sizeClasses)}>
      <motion.div
        aria-hidden
        className={cn('absolute inset-3 rounded-full bg-gradient-to-br blur-2xl', STATE_ACCENTS[state])}
        animate={{
          scale: [0.98, 1.04, 0.98],
          opacity: state === 'sleep' ? [0.36, 0.28, 0.36] : [0.48, 0.72, 0.48],
        }}
        transition={{ duration: bobDuration, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute inset-0 rounded-full border"
        style={{ borderColor: STATE_RING[state] }}
        animate={{ scale: [0.94, 1.02, 0.94], opacity: [0.3, 0.72, 0.3] }}
        transition={{ duration: state === 'working' ? 1.6 : 2.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />

      <motion.div
        className="relative"
        animate={{ y: bobY, rotate: state === 'working' ? [0, -2, 2, 0] : state === 'listen' ? [0, -1, 1, 0] : [0, 0, 0] }}
        transition={{ duration: bobDuration, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute -top-4 left-4 h-10 w-10 rotate-[-16deg] rounded-[50%_50%_45%_45%] bg-[#6b4b39] shadow-sm">
            <div className="absolute inset-[5px] rounded-[50%_50%_45%_45%] bg-[#f6e3cf]" />
          </div>
          <div className="absolute -top-4 right-4 h-10 w-10 rotate-[16deg] rounded-[50%_50%_45%_45%] bg-[#6b4b39] shadow-sm">
            <div className="absolute inset-[5px] rounded-[50%_50%_45%_45%] bg-[#f6e3cf]" />
          </div>

          <div className={cn('relative rounded-[46%_46%_42%_42%] bg-[#7b5843] shadow-[0_20px_60px_rgba(96,56,19,0.16)]', faceSize)}>
            <div className="absolute inset-[12px] rounded-[46%_46%_44%_44%] bg-[#f5e7d5]" />
            <div className="absolute inset-x-[18px] top-[18px] h-10 rounded-full bg-[#2f3643]" />
            <div className="absolute left-[32px] top-[34px] flex flex-col items-center gap-2">
              <div className={eyeClass} />
            </div>
            <div className="absolute right-[32px] top-[34px] flex flex-col items-center gap-2">
              <div className={eyeClass} />
            </div>
            <div className="absolute left-1/2 top-[56px] h-6 w-7 -translate-x-1/2 rounded-[45%_45%_55%_55%] bg-[#2f3643]" />
            <div className="absolute left-1/2 top-[78px] flex -translate-x-1/2 items-center gap-1">
              <div className="h-[2px] w-4 rounded-full bg-[#835f47]" />
              <div className="h-[6px] w-[10px] rounded-b-full border-b-2 border-[#835f47]" />
              <div className="h-[2px] w-4 rounded-full bg-[#835f47]" />
            </div>
            <div className="absolute bottom-[10px] left-1/2 h-6 w-12 -translate-x-1/2 rounded-full bg-white/25 blur-md" />
          </div>

          <motion.div
            className="absolute -right-6 bottom-2 h-20 w-9 origin-bottom-left rounded-full bg-[#81553f]"
            animate={{ rotate: state === 'sleep' ? [-18, -10, -18] : [-18, 8, -18] }}
            transition={{ duration: state === 'working' ? 1.6 : state === 'listen' ? 2.2 : 2.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          >
            <div className="absolute inset-y-1 left-[9px] w-3 rounded-full bg-[#d5b193]" />
            <div className="absolute bottom-0 left-0 h-7 w-9 rounded-full bg-[#5d3d30]" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
