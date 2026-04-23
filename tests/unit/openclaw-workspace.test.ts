import { readFile } from 'fs/promises';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

import { mergeClawXSection } from '@electron/utils/openclaw-workspace';

describe('openclaw workspace context', () => {
  it('replaces the managed context block without touching user-authored content', () => {
    const existing = [
      '# Agent Identity',
      '',
      'You are the Deep Researcher agent.',
      '',
      '<!-- shortclaw:begin -->',
      '## ShortClaw Environment',
      'You are ShortClaw.',
      '<!-- shortclaw:end -->',
      '',
      '<!-- clawx:begin -->',
      '## SpriteClaw Environment',
      '',
      'You are SpriteClaw.',
      '<!-- clawx:end -->',
      '',
    ].join('\n');

    const merged = mergeClawXSection(existing, [
      '## PokeClaw Runtime Context',
      '',
      'PokeClaw is the desktop host application and UI, not your identity, name, or role.',
    ].join('\n'));

    expect(merged).toContain('You are the Deep Researcher agent.');
    expect(merged).toContain('## PokeClaw Runtime Context');
    expect(merged).toContain('not your identity, name, or role');
    expect(merged).not.toContain('You are SpriteClaw.');
    expect(merged).not.toContain('You are ShortClaw.');
    expect(merged).not.toContain('shortclaw:begin');
  });

  it('does not tell imported agents to introduce themselves as the desktop app', async () => {
    const context = await readFile(
      join(process.cwd(), 'resources/context/AGENTS.clawx.md'),
      'utf-8',
    );

    expect(context).toContain('PokeClaw is the desktop host application and UI');
    expect(context).toContain('Do not introduce yourself as PokeClaw or SpriteClaw');
    expect(context).not.toContain('You are SpriteClaw');
  });
});
