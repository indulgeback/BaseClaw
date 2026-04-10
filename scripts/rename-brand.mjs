import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_FROM = 'ClawX';
const LOCALE_ROOT = 'src/i18n/locales';

const STATIC_TARGETS = new Map([
  ['index.html', [/<title>/]],
  ['package.json', [/^\s*"description":/, /^\s*"author":/]],
  [
    'electron-builder.yml',
    [
      /^productName:/,
      /^copyright:/,
      /^\s*NSMicrophoneUsageDescription:/,
      /^\s*NSCameraUsageDescription:/,
      /^\s*shortcutName:/,
      /^\s*uninstallDisplayName:/,
      /^\s*maintainer:/,
      /^\s*vendor:/,
      /^\s*description:/,
      /^\s*Name:/,
    ],
  ],
  ['src/components/layout/Sidebar.tsx', [/alt="ClawX"/, /^\s*ClawX\s*$/]],
  ['src/pages/Setup/index.tsx', [/alt="ClawX"/]],
  ['src/lib/gateway-client.ts', [/displayName:\s*'ClawX'/]],
  ['src/lib/api-client.ts', [/displayName:\s*'ClawX UI'/]],
  ['electron/gateway/process-launcher.ts', [/\['X-Title'\]\s*=\s*'ClawX'/]],
  ['electron/gateway/ws-client.ts', [/displayName:\s*'ClawX'/]],
  ['electron/shared/providers/registry.ts', [/'X-Title':\s*'ClawX'/]],
  ['electron/main/tray.ts', [/ClawX - AI Assistant/, /Show ClawX/, /Quit ClawX/, /`ClawX - \$\{status\}`/]],
  ['electron/main/launch-at-startup.ts', [/'Name=ClawX'/, /'Comment=ClawX - AI Assistant'/]],
  ['electron/utils/browser-oauth.ts', [/Manual browser OAuth fallback is not implemented in ClawX yet/]],
  [
    'electron/utils/gemini-cli-oauth.ts',
    [
      /go back to ClawX and try again/i,
      /return to ClawX/i,
      /Remote\/manual Gemini OAuth is not implemented in ClawX yet/,
    ],
  ],
  ['electron/utils/openrouter-headers-preload.cjs', [/\['X-Title'\]\s*=\s*'ClawX'/]],
]);

function printUsage() {
  console.log(`
Rename app-facing brand copy without touching code identifiers, automation scripts, or GitHub Actions.

Usage:
  pnpm rename:brand -- --to "New Brand"
  pnpm rename:brand -- "New Brand"
  pnpm rename:brand -- --from "Old Brand" --to "New Brand" --dry-run
`);
}

function parseArgs(argv) {
  let from = DEFAULT_FROM;
  let to = '';
  let dryRun = false;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--from') {
      from = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (arg.startsWith('--from=')) {
      from = arg.slice('--from='.length);
      continue;
    }
    if (arg === '--to') {
      to = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (arg.startsWith('--to=')) {
      to = arg.slice('--to='.length);
      continue;
    }
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }
    if (!arg.startsWith('-') && !to) {
      to = arg;
    }
  }

  return { from, to, dryRun, help };
}

function countOccurrences(input, needle) {
  if (!needle) {
    return 0;
  }

  return input.split(needle).length - 1;
}

function replaceLine(line, from, to) {
  const replacements = countOccurrences(line, from);
  if (replacements === 0) {
    return { line, replacements: 0 };
  }

  return {
    line: line.split(from).join(to),
    replacements,
  };
}

function isLocaleFile(relativePath) {
  return relativePath.startsWith(`${LOCALE_ROOT}/`) && relativePath.endsWith('.json');
}

export function isManagedFile(relativePath) {
  return isLocaleFile(relativePath) || STATIC_TARGETS.has(relativePath);
}

export function transformManagedFile({ relativePath, content, from, to }) {
  if (!isManagedFile(relativePath)) {
    return {
      content,
      changed: false,
      replacements: 0,
    };
  }

  if (isLocaleFile(relativePath)) {
    const replacements = countOccurrences(content, from);
    if (replacements === 0) {
      return {
        content,
        changed: false,
        replacements: 0,
      };
    }

    return {
      content: content.split(from).join(to),
      changed: true,
      replacements,
    };
  }

  const selectors = STATIC_TARGETS.get(relativePath) ?? [];
  const lines = content.split('\n');
  let replacements = 0;

  const nextLines = lines.map((line) => {
    if (!line.includes(from)) {
      return line;
    }

    const shouldReplace = selectors.some((selector) => {
      selector.lastIndex = 0;
      return selector.test(line);
    });

    if (!shouldReplace) {
      return line;
    }

    const result = replaceLine(line, from, to);
    replacements += result.replacements;
    return result.line;
  });

  if (replacements === 0) {
    return {
      content,
      changed: false,
      replacements: 0,
    };
  }

  return {
    content: nextLines.join('\n'),
    changed: true,
    replacements,
  };
}

async function listLocaleFiles(rootDir) {
  const localeDir = path.join(rootDir, LOCALE_ROOT);
  const results = [];

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.json')) {
        results.push(path.relative(rootDir, fullPath).split(path.sep).join('/'));
      }
    }
  }

  await walk(localeDir);
  return results.sort();
}

export async function collectManagedFiles(rootDir) {
  const localeFiles = await listLocaleFiles(rootDir);
  return [...STATIC_TARGETS.keys(), ...localeFiles];
}

async function renameBrand({ rootDir, from, to, dryRun }) {
  const managedFiles = await collectManagedFiles(rootDir);
  const changedFiles = [];
  let totalReplacements = 0;

  for (const relativePath of managedFiles) {
    const absolutePath = path.join(rootDir, relativePath);
    const original = await readFile(absolutePath, 'utf8');
    const result = transformManagedFile({
      relativePath,
      content: original,
      from,
      to,
    });

    if (!result.changed) {
      continue;
    }

    totalReplacements += result.replacements;
    changedFiles.push({
      relativePath,
      replacements: result.replacements,
    });

    if (!dryRun) {
      await writeFile(absolutePath, result.content, 'utf8');
    }
  }

  const action = dryRun ? 'Would update' : 'Updated';
  console.log(`${action} ${changedFiles.length} file(s), ${totalReplacements} replacement(s).`);

  if (changedFiles.length > 0) {
    for (const file of changedFiles) {
      console.log(`- ${file.relativePath} (${file.replacements})`);
    }
  }

  if (changedFiles.length === 0) {
    console.log('No managed brand copy matched the source brand.');
  }
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isEntrypoint) {
  const { from, to, dryRun, help } = parseArgs(process.argv.slice(2));

  if (help) {
    printUsage();
    process.exit(0);
  }

  if (!from || !to) {
    printUsage();
    process.exit(1);
  }

  if (from === to) {
    console.log('Source and target brand are identical; nothing to do.');
    process.exit(0);
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(scriptDir, '..');

  try {
    await renameBrand({ rootDir, from, to, dryRun });
  } catch (error) {
    console.error('Failed to rename brand copy.', error);
    process.exit(1);
  }
}
