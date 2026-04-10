import { describe, expect, it } from 'vitest';

import { isManagedFile, transformManagedFile } from '../../scripts/rename-brand.mjs';

describe('rename-brand script', () => {
  it('replaces all occurrences inside locale JSON files', () => {
    const content = JSON.stringify({
      subtitle: 'Configure your ClawX experience',
      userAgent: 'ClawX/1.0',
    });

    const result = transformManagedFile({
      relativePath: 'src/i18n/locales/en/settings.json',
      content,
      from: 'ClawX',
      to: 'NovaDesk',
    });

    expect(result.changed).toBe(true);
    expect(result.replacements).toBe(2);
    expect(result.content).toContain('NovaDesk experience');
    expect(result.content).toContain('NovaDesk/1.0');
  });

  it('updates managed package metadata without changing package identifiers', () => {
    const content = `{
  "name": "clawx",
  "description": "ClawX - Graphical AI Assistant based on OpenClaw",
  "author": "ClawX Team"
}`;

    const result = transformManagedFile({
      relativePath: 'package.json',
      content,
      from: 'ClawX',
      to: 'NovaDesk',
    });

    expect(result.changed).toBe(true);
    expect(result.content).toContain('"name": "clawx"');
    expect(result.content).toContain('"description": "NovaDesk - Graphical AI Assistant based on OpenClaw"');
    expect(result.content).toContain('"author": "NovaDesk Team"');
  });

  it('keeps GitHub repository fields untouched in electron-builder metadata', () => {
    const content = `productName: ClawX
publish:
  provider: github
  repo: ClawX
linux:
  shortcutName: ClawX`;

    const result = transformManagedFile({
      relativePath: 'electron-builder.yml',
      content,
      from: 'ClawX',
      to: 'NovaDesk',
    });

    expect(result.changed).toBe(true);
    expect(result.content).toContain('productName: NovaDesk');
    expect(result.content).toContain('shortcutName: NovaDesk');
    expect(result.content).toContain('repo: ClawX');
  });

  it('replaces sidebar copy without touching unrelated files', () => {
    const sidebar = `            <img src={logoSvg} alt="ClawX" className="h-5 w-auto shrink-0" />
              ClawX`;
    const sidebarResult = transformManagedFile({
      relativePath: 'src/components/layout/Sidebar.tsx',
      content: sidebar,
      from: 'ClawX',
      to: 'NovaDesk',
    });

    expect(sidebarResult.changed).toBe(true);
    expect(sidebarResult.content).toContain('alt="NovaDesk"');
    expect(sidebarResult.content).toContain('NovaDesk');

    expect(isManagedFile('electron/services/providers/store-instance.ts')).toBe(false);
    const untouched = transformManagedFile({
      relativePath: 'electron/services/providers/store-instance.ts',
      content: 'export async function getClawXProviderStore() {}',
      from: 'ClawX',
      to: 'NovaDesk',
    });

    expect(untouched.changed).toBe(false);
    expect(untouched.content).toBe('export async function getClawXProviderStore() {}');
  });
});
