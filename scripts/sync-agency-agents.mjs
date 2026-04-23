#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

const SOURCE_REPO = 'https://github.com/msitarzewski/agency-agents.git';
const SOURCE_COMMIT = '783f6a72bfd7f3135700ac273c619d92821b419a';
const SHORT_COMMIT = SOURCE_COMMIT.slice(0, 7);
const AGENT_DIRS = [
  'academic',
  'design',
  'engineering',
  'finance',
  'game-development',
  'marketing',
  'paid-media',
  'product',
  'project-management',
  'sales',
  'spatial-computing',
  'specialized',
  'strategy',
  'support',
  'testing',
];

const repoRoot = process.cwd();
const outputRoot = join(repoRoot, 'src', 'data', 'agency-agents');
const detailRoot = join(outputRoot, 'details');

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function readFrontmatter(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    fields[key] = value;
  }
  return { fields, body: match[2] };
}

function splitOpenClawFiles(body) {
  let soul = '';
  let agents = '';
  let currentTarget = 'agents';
  let currentSection = '';
  const flush = () => {
    if (!currentSection) return;
    if (currentTarget === 'soul') {
      soul += currentSection;
    } else {
      agents += currentSection;
    }
    currentSection = '';
  };

  for (const line of body.split('\n')) {
    if (line.startsWith('## ')) {
      flush();
      const header = line.toLowerCase();
      currentTarget =
        /identity/.test(header)
        || /learning.*memory/.test(header)
        || /communication/.test(header)
        || /style/.test(header)
        || /critical.rule/.test(header)
        || /rules.you.must.follow/.test(header)
          ? 'soul'
          : 'agents';
    }
    currentSection += `${line}\n`;
  }
  flush();

  return {
    'SOUL.md': soul,
    'AGENTS.md': agents,
  };
}

function collectMarkdownFiles(root) {
  const files = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...collectMarkdownFiles(path));
    } else if (entry.endsWith('.md')) {
      files.push(path);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function titleCaseCategory(categoryId) {
  return categoryId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const tmp = mkdtempSync(join(tmpdir(), 'agency-agents-'));
try {
  execFileSync('git', ['clone', '--quiet', SOURCE_REPO, tmp], { stdio: 'inherit' });
  execFileSync('git', ['checkout', '--quiet', SOURCE_COMMIT], { cwd: tmp, stdio: 'inherit' });

  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(detailRoot, { recursive: true });

  const catalogTemplates = [];
  const detailsByCategory = {};
  const importedCategoryIds = [];

  for (const categoryId of AGENT_DIRS) {
    const categoryRoot = join(tmp, categoryId);
    let categoryCount = 0;
    if (!statSync(categoryRoot, { throwIfNoEntry: false })?.isDirectory()) continue;

    for (const filePath of collectMarkdownFiles(categoryRoot)) {
      const parsed = readFrontmatter(filePath);
      if (!parsed?.fields.name || !parsed.fields.description) continue;

      const templateId = slugify(parsed.fields.name);
      if (!templateId) continue;

      const files = splitOpenClawFiles(parsed.body);
      files['IDENTITY.md'] =
        parsed.fields.emoji && parsed.fields.vibe
          ? `# ${parsed.fields.emoji} ${parsed.fields.name}\n${parsed.fields.vibe}\n`
          : `# ${parsed.fields.name}\n${parsed.fields.description}\n`;

      const sourcePath = relative(tmp, filePath).replace(/\\/g, '/');
      const summary = {
        id: templateId,
        templateId,
        name: parsed.fields.name,
        description: parsed.fields.description,
        categoryId,
        category: titleCaseCategory(categoryId),
        version: SHORT_COMMIT,
        badge: 'Imported',
        status: 'stable',
        tags: [],
        modelRef: null,
        previewFiles: [
          { fileKey: 'SOUL.md', description: 'Persona, tone, boundaries, and operating rules.' },
          { fileKey: 'AGENTS.md', description: 'Mission, workflows, deliverables, and domain playbooks.' },
          { fileKey: 'IDENTITY.md', description: 'Name, icon, and short agency identity.' },
        ],
        sourceRepo: 'msitarzewski/agency-agents',
        sourceCommit: SOURCE_COMMIT,
        sourcePath,
        emoji: parsed.fields.emoji || undefined,
        vibe: parsed.fields.vibe || undefined,
      };

      catalogTemplates.push(summary);
      detailsByCategory[categoryId] ??= {};
      detailsByCategory[categoryId][templateId] = {
        ...summary,
        files,
      };
      categoryCount += 1;
    }

    if (categoryCount > 0) importedCategoryIds.push(categoryId);
  }

  const ids = new Set();
  for (const template of catalogTemplates) {
    if (ids.has(template.id)) {
      throw new Error(`Duplicate template id: ${template.id}`);
    }
    ids.add(template.id);
  }

  const categories = importedCategoryIds.map((categoryId) => ({
    id: categoryId,
    name: titleCaseCategory(categoryId),
    count: catalogTemplates.filter((template) => template.categoryId === categoryId).length,
  }));

  writeFileSync(
    join(outputRoot, 'catalog.json'),
    `${JSON.stringify({
      sourceRepo: 'msitarzewski/agency-agents',
      sourceCommit: SOURCE_COMMIT,
      sourceCommitShort: SHORT_COMMIT,
      generatedAt: new Date().toISOString(),
      categories,
      templates: catalogTemplates,
    }, null, 2)}\n`,
  );

  for (const [categoryId, details] of Object.entries(detailsByCategory)) {
    writeFileSync(join(detailRoot, `${categoryId}.json`), `${JSON.stringify(details, null, 2)}\n`);
  }

  console.log(`Imported ${catalogTemplates.length} Agency Agents templates across ${categories.length} categories.`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
