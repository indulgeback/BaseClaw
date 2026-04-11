import { describe, expect, it } from 'vitest';
import { buildSpritePayload, deriveSpriteState, DEFAULT_SPRITE_SIGNALS } from '@/lib/sprite';

describe('sprite state derivation', () => {
  it('maps the welcome state when the chat is empty', () => {
    expect(deriveSpriteState({ ...DEFAULT_SPRITE_SIGNALS, isWelcome: true })).toBe('welcome');
  });

  it('maps listening while the composer is active', () => {
    expect(deriveSpriteState({
      ...DEFAULT_SPRITE_SIGNALS,
      isWelcome: false,
      inputFocused: true,
    })).toBe('listening');
  });

  it('maps thinking before a response starts streaming', () => {
    expect(deriveSpriteState({
      ...DEFAULT_SPRITE_SIGNALS,
      isWelcome: false,
      sending: true,
      hasStreaming: false,
    })).toBe('thinking');
  });

  it('maps responding once streaming output is available', () => {
    expect(deriveSpriteState({
      ...DEFAULT_SPRITE_SIGNALS,
      isWelcome: false,
      sending: true,
      hasStreaming: true,
    })).toBe('responding');
  });

  it('maps sleeping when the main window loses focus', () => {
    expect(deriveSpriteState({
      ...DEFAULT_SPRITE_SIGNALS,
      isWelcome: false,
      windowFocused: false,
    })).toBe('sleeping');
  });

  it('builds the raccoon payload for overlay sync', () => {
    const payload = buildSpritePayload('raccoon', 'idle');
    expect(payload.characterId).toBe('raccoon');
    expect(payload.state).toBe('idle');
    expect(payload.title).toBeTruthy();
    expect(payload.subtitle).toBeTruthy();
  });
});
