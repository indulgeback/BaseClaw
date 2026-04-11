import { describe, expect, it } from 'vitest';
import { buildSpritePayload, deriveSpriteState, DEFAULT_SPRITE_SIGNALS } from '@/lib/sprite';

describe('sprite state derivation', () => {
  it('maps idle when no higher-priority signal is present', () => {
    expect(deriveSpriteState({ ...DEFAULT_SPRITE_SIGNALS })).toBe('idle');
  });

  it('maps listen while the composer is active', () => {
    expect(deriveSpriteState({
      ...DEFAULT_SPRITE_SIGNALS,
      inputFocused: true,
    })).toBe('listen');
  });

  it('maps working before a response starts streaming', () => {
    expect(deriveSpriteState({
      ...DEFAULT_SPRITE_SIGNALS,
      sending: true,
      hasStreaming: false,
    })).toBe('working');
  });

  it('keeps working once streaming output is available', () => {
    expect(deriveSpriteState({
      ...DEFAULT_SPRITE_SIGNALS,
      sending: true,
      hasStreaming: true,
    })).toBe('working');
  });

  it('maps sleep when the main window loses focus', () => {
    expect(deriveSpriteState({
      ...DEFAULT_SPRITE_SIGNALS,
      windowFocused: false,
    })).toBe('sleep');
  });

  it('builds the raccoon payload for overlay sync', () => {
    const payload = buildSpritePayload('raccoon', 'idle');
    expect(payload.characterId).toBe('raccoon');
    expect(payload.state).toBe('idle');
    expect(payload.title).toBeTruthy();
    expect(payload.subtitle).toBeTruthy();
  });
});
