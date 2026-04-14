#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const inputDir = process.argv[2]
  ? join(repoRoot, process.argv[2])
  : join(repoRoot, 'resources', 'sprites', 'raccoon', 'masters');
const outputDir = process.argv[3]
  ? join(repoRoot, process.argv[3])
  : join(repoRoot, 'src', 'assets', 'sprites', 'raccoon', 'webm');

if (!existsSync(inputDir)) {
  console.error(`Input directory does not exist: ${inputDir}`);
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const sourceFiles = readdirSync(inputDir)
  .filter((file) => ['.mov', '.mp4', '.mkv', '.webm'].includes(extname(file).toLowerCase()))
  .filter((file) => file.includes('_master_'));

if (sourceFiles.length === 0) {
  console.log(`No *_master_* source files found in: ${inputDir}`);
  process.exit(0);
}

for (const file of sourceFiles) {
  const inputPath = join(inputDir, file);
  const outputName = basename(file, extname(file)).replace('_master_', '_alpha_') + '.webm';
  const outputPath = join(outputDir, outputName);

  console.log(`Converting ${file} -> ${outputName}`);

  const result = spawnSync('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-vf', 'scale=960:-2:flags=lanczos',
    '-c:v', 'libvpx-vp9',
    '-pix_fmt', 'yuva420p',
    '-b:v', '0',
    '-crf', '38',
    '-row-mt', '1',
    '-an',
    outputPath,
  ], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.error(`ffmpeg failed for ${file}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`Done. WebM alpha files written to: ${outputDir}`);
