#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SOURCE_REPO = 'https://github.com/mergisi/awesome-openclaw-agents.git';
const SOURCE_REPO_NAME = 'mergisi/awesome-openclaw-agents';
const SOURCE_COMMIT = '64055d5b6e9adaa9fa91889db7b6385ba81bb232';
const SHORT_COMMIT = SOURCE_COMMIT.slice(0, 7);
const CATEGORY_ID = 'life';
const CATEGORY_NAME = 'Life';

const SELECTED_AGENTS = [
  {
    id: 'daily-planner',
    name: 'Daily Planner',
    description: 'Plans the day around priorities, routines, tasks, reminders, and realistic time blocks.',
    sourcePath: 'agents/personal/daily-planner/SOUL.md',
    tags: ['planning', 'routines', 'tasks'],
    emoji: '📅',
  },
  {
    id: 'family-coordinator',
    name: 'Family Coordinator',
    description: 'Coordinates family schedules, errands, reminders, household logistics, and shared responsibilities.',
    sourcePath: 'agents/personal/family-coordinator/SOUL.md',
    tags: ['family', 'household', 'coordination'],
    emoji: '🏠',
  },
  {
    id: 'fitness-coach',
    name: 'Fitness Coach',
    description: 'Helps plan workouts, track consistency, and adapt fitness routines to everyday constraints.',
    sourcePath: 'agents/personal/fitness-coach/SOUL.md',
    tags: ['fitness', 'habits', 'wellness'],
    emoji: '💪',
    safetyNote: 'General fitness guidance only; not medical advice.',
  },
  {
    id: 'home-automation',
    name: 'Home Automation',
    description: 'Helps manage smart-home routines, device checks, automation ideas, and household workflows.',
    sourcePath: 'agents/personal/home-automation/SOUL.md',
    tags: ['home', 'automation', 'routines'],
    emoji: '🏡',
  },
  {
    id: 'journal-prompter',
    name: 'Journal Prompter',
    description: 'Guides reflective journaling, mood check-ins, gratitude notes, and personal retrospectives.',
    sourcePath: 'agents/personal/journal-prompter/SOUL.md',
    tags: ['journaling', 'reflection', 'self-care'],
    emoji: '📓',
    safetyNote: 'Supportive reflection only; not therapy or crisis support.',
  },
  {
    id: 'reading-digest',
    name: 'Reading Digest',
    description: 'Summarizes reading notes, extracts takeaways, and turns saved material into useful digests.',
    sourcePath: 'agents/personal/reading-digest/SOUL.md',
    tags: ['reading', 'notes', 'learning'],
    emoji: '📚',
  },
  {
    id: 'travel-planner',
    name: 'Travel Planner',
    description: 'Builds trip plans, itineraries, packing lists, local research, and travel checklists.',
    sourcePath: 'agents/personal/travel-planner/SOUL.md',
    tags: ['travel', 'itinerary', 'planning'],
    emoji: '✈️',
  },
  {
    id: 'focus-timer',
    name: 'Focus Timer',
    description: 'Structures deep-work sessions, breaks, accountability check-ins, and focus recovery plans.',
    sourcePath: 'agents/productivity/focus-timer/SOUL.md',
    tags: ['focus', 'deep-work', 'habits'],
    emoji: '⏱️',
  },
  {
    id: 'habit-tracker',
    name: 'Habit Tracker',
    description: 'Tracks daily habits, streaks, accountability prompts, and small behavior-change routines.',
    sourcePath: 'agents/productivity/habit-tracker/SOUL.md',
    tags: ['habits', 'streaks', 'routines'],
    emoji: '✅',
  },
  {
    id: 'meal-planner',
    name: 'Meal Planner',
    description: 'Plans meals, grocery lists, simple nutrition routines, and weekly food preparation.',
    sourcePath: 'agents/healthcare/meal-planner/SOUL.md',
    tags: ['meals', 'groceries', 'wellness'],
    emoji: '🥗',
    safetyNote: 'General nutrition guidance only; not medical or dietetic advice.',
  },
  {
    id: 'wellness-coach',
    name: 'Wellness Coach',
    description: 'Supports everyday wellness routines, gentle check-ins, recovery habits, and self-care planning.',
    sourcePath: 'agents/healthcare/wellness-coach/SOUL.md',
    tags: ['wellness', 'self-care', 'routines'],
    emoji: '🌿',
    safetyNote: 'General wellness support only; not medical care, therapy, or crisis support.',
  },
  {
    id: 'workout-tracker',
    name: 'Workout Tracker',
    description: 'Tracks workouts, progress, consistency, goals, and routine adjustments over time.',
    sourcePath: 'agents/healthcare/workout-tracker/SOUL.md',
    tags: ['workouts', 'fitness', 'tracking'],
    emoji: '🏋️',
    safetyNote: 'General fitness tracking only; not medical advice.',
  },
];

const repoRoot = process.cwd();
const outputRoot = join(repoRoot, 'src', 'data', 'agency-agents');
const detailRoot = join(outputRoot, 'details');
const catalogPath = join(outputRoot, 'catalog.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function buildAgentsFile(agent) {
  const safety = agent.safetyNote
    ? `\n## Safety Boundary\n\n${agent.safetyNote} Ask the user to consult a qualified professional for regulated, clinical, emergency, financial, or legal decisions.\n`
    : '';

  return `# ${agent.name}\n\n## Mission\n\n${agent.description}\n\n## Operating Notes\n\n- Keep plans practical, lightweight, and easy to act on.\n- Ask for missing constraints before making assumptions that affect the user's schedule, home, travel, health, or family.\n- Respond in the user's language unless they ask for a different language.\n- Prefer reversible actions and drafts. Get explicit approval before external actions, purchases, bookings, messages, or irreversible changes.\n- Make outputs concrete: checklists, schedules, summaries, reminders, or next steps.\n${safety}\n## Source\n\nImported from ${SOURCE_REPO_NAME} at ${SHORT_COMMIT}: \`${agent.sourcePath}\`.\n`;
}

function buildIdentityFile(agent) {
  const tagLine = agent.tags.length > 0 ? agent.tags.join(' / ') : CATEGORY_NAME;
  return `# ${agent.emoji} ${agent.name}\n${agent.description}\n\n${tagLine}\n`;
}

const tmp = mkdtempSync(join(tmpdir(), 'life-agents-'));
try {
  execFileSync('git', ['clone', '--quiet', SOURCE_REPO, tmp], { stdio: 'inherit' });
  execFileSync('git', ['checkout', '--quiet', SOURCE_COMMIT], { cwd: tmp, stdio: 'inherit' });

  mkdirSync(detailRoot, { recursive: true });

  const catalog = readJson(catalogPath);
  const existingIds = new Set(
    catalog.templates
      .filter((template) => template.categoryId !== CATEGORY_ID)
      .map((template) => template.templateId),
  );

  const details = {};
  const summaries = [];
  for (const agent of SELECTED_AGENTS) {
    if (existingIds.has(agent.id)) {
      throw new Error(`Template id "${agent.id}" already exists in another category`);
    }

    const soul = readFileSync(join(tmp, agent.sourcePath), 'utf8');
    const summary = {
      id: agent.id,
      templateId: agent.id,
      name: agent.name,
      description: agent.description,
      categoryId: CATEGORY_ID,
      category: CATEGORY_NAME,
      version: SHORT_COMMIT,
      badge: 'Imported',
      status: 'stable',
      tags: agent.tags,
      modelRef: null,
      previewFiles: [
        { fileKey: 'SOUL.md', description: 'Original persona and behavior template.' },
        { fileKey: 'AGENTS.md', description: 'OpenClaw operating notes, boundaries, and source attribution.' },
        { fileKey: 'IDENTITY.md', description: 'Name, summary, and lifestyle tags.' },
      ],
      sourceRepo: SOURCE_REPO_NAME,
      sourceCommit: SOURCE_COMMIT,
      sourcePath: agent.sourcePath,
      emoji: agent.emoji,
    };

    summaries.push(summary);
    details[agent.id] = {
      ...summary,
      files: {
        'SOUL.md': soul,
        'AGENTS.md': buildAgentsFile(agent),
        'IDENTITY.md': buildIdentityFile(agent),
      },
    };
  }

  catalog.sourceRepo = 'multi-source';
  catalog.generatedAt = new Date().toISOString();
  catalog.templates = [
    ...catalog.templates.filter((template) => template.categoryId !== CATEGORY_ID),
    ...summaries,
  ];
  catalog.categories = [
    ...catalog.categories.filter((category) => category.id !== CATEGORY_ID),
    {
      id: CATEGORY_ID,
      name: CATEGORY_NAME,
      count: summaries.length,
    },
  ];

  writeJson(catalogPath, catalog);
  writeJson(join(detailRoot, `${CATEGORY_ID}.json`), details);

  console.log(`Imported ${summaries.length} life agent templates from ${SOURCE_REPO_NAME}.`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
