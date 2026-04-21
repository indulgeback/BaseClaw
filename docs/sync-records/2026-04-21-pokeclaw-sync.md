# 2026-04-21 Sync Record

## Branch

`pokeclaw-dev`

## Purpose

This branch is the PokeClaw variant branch. It carries variant-specific shell branding, sprite behavior, and UI customization on top of `dev`.

## Source

- Merged from local `dev`
- Local result on this branch: `b92c5b6`

## What Arrived Through The Sync Chain

The branch absorbed the latest shared updates through:

1. `upstream/main -> main`
2. `main -> dev`
3. `dev -> pokeclaw-dev`

The sync brought in:

- `v0.3.10` upstream release updates
- extension registry and ext-bridge generation support
- chat execution graph fixes and folding improvements
- onboarding flow changes that move provider setup into Settings
- OpenClaw `4.15` and refreshed bundled dependencies
- updated E2E and unit coverage

## Variant-Specific Follow-Up Done Here

During the merge, this branch kept its existing variant-specific choices while adopting the shared sync updates:

- retained variant shell/process branding already present on this branch
- preserved sprite overlay wiring and composer-presence signals
- kept the variant welcome screen treatment in chat
- restored `chat-composer-*` test ids on the variant composer after taking the shared layout

## What Variant Developers Should Check First

- startup/setup flow text versus current branch branding
- chat composer behavior and execution graph rendering
- sprite overlay state sync during idle, typing, and streaming
- packaging scripts that now generate extension bridges before dev/build/package

## Recommended Workflow For The Next Sync

1. Update `main` from `upstream/main`
2. Merge `main` into `dev`
3. Merge `dev` into `pokeclaw-dev`
4. Review variant branding, docs, and sprite-specific UX
5. Run at least `pnpm run typecheck`

Reference:

- `docs/branch-strategy.md`
