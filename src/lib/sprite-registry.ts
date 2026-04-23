import type { SpriteAssetManifest, SpriteProfile, SpriteSignals, SpriteState } from '@/types/sprite';
import type { SpriteCharacterId } from '@/types/sprite';
import idleLoopWebm from '@/assets/sprites/raccoon/webm/sprite_raccoon_idle_loop_alpha_v01.webm';
import idleToListenEnterWebm from '@/assets/sprites/raccoon/webm/sprite_raccoon_idle_to_listen_enter_alpha_v01.webm';
import listenLoopWebm from '@/assets/sprites/raccoon/webm/sprite_raccoon_listen_loop_alpha_v01.webm';
import listenToIdleExitWebm from '@/assets/sprites/raccoon/webm/sprite_raccoon_listen_to_idle_exit_alpha_v01.webm';
import idleToWorkingEnterWebm from '@/assets/sprites/raccoon/webm/sprite_raccoon_idle_to_working_enter_alpha_v01.webm';
import workingLoopWebm from '@/assets/sprites/raccoon/webm/sprite_raccoon_working_loop_alpha_v01.webm';
import workingToIdleExitWebm from '@/assets/sprites/raccoon/webm/sprite_raccoon_working_to_idle_exit_alpha_v01.webm';
import idleToSleepEnterWebm from '@/assets/sprites/raccoon/webm/sprite_raccoon_idle_to_sleep_enter_alpha_v01.webm';
import sleepLoopWebm from '@/assets/sprites/raccoon/webm/sprite_raccoon_sleep_loop_alpha_v01.webm';
import sleepToIdleExitWebm from '@/assets/sprites/raccoon/webm/sprite_raccoon_sleep_to_idle_exit_alpha_v01.webm';

export const DEFAULT_SPRITE_CHARACTER_ID: SpriteCharacterId = 'raccoon';

export const SPRITE_PROFILES: Record<SpriteCharacterId, SpriteProfile> = {
  raccoon: {
    id: 'raccoon',
    name: 'Raccoon Sprite',
    shortName: 'Raccoon',
    description: 'A nimble guide that keeps PokeClaw lively, warm, and alert.',
    accent: 'hsl(28 76% 58%)',
    assets: {
      idle: {
        state: 'idle',
        loop: idleLoopWebm,
      },
      listen: {
        state: 'listen',
        enter: idleToListenEnterWebm,
        loop: listenLoopWebm,
        exit: listenToIdleExitWebm,
      },
      working: {
        state: 'working',
        enter: idleToWorkingEnterWebm,
        loop: workingLoopWebm,
        exit: workingToIdleExitWebm,
      },
      sleep: {
        state: 'sleep',
        enter: idleToSleepEnterWebm,
        loop: sleepLoopWebm,
        exit: sleepToIdleExitWebm,
      },
    },
  },
};

export const DEFAULT_SPRITE_SIGNALS: SpriteSignals = {
  inputFocused: false,
  hasDraft: false,
  sending: false,
  pendingFinal: false,
  hasStreaming: false,
  windowFocused: true,
  documentVisible: true,
};

const SPRITE_COPY: Record<SpriteState, { title: string; subtitle: string }> = {
  idle: {
    title: 'Sprite calm',
    subtitle: 'Everything is steady. Drop a task whenever you are ready.',
  },
  listen: {
    title: 'Sprite listening',
    subtitle: 'Drafting, attaching, and lining up the next move.',
  },
  working: {
    title: 'Sprite working',
    subtitle: 'Processing the next move and keeping the run in motion.',
  },
  sleep: {
    title: 'Sprite sleeping',
    subtitle: 'Quiet mode on until you come back.',
  },
};

export function getSpriteProfile(characterId: SpriteCharacterId): SpriteProfile {
  return SPRITE_PROFILES[characterId] ?? SPRITE_PROFILES[DEFAULT_SPRITE_CHARACTER_ID];
}

export function getSpriteCopy(state: SpriteState): { title: string; subtitle: string } {
  return SPRITE_COPY[state];
}

export function getSpriteAsset(
  characterId: SpriteCharacterId,
  state: SpriteState,
): SpriteAssetManifest {
  return getSpriteProfile(characterId).assets[state];
}
