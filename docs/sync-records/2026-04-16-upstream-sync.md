# 2026-04-16 Sync Record

## Branch

`spriteClaw-dev`

## Purpose

This branch is the SpriteClaw variant branch. It contains Sprite-specific branding, assets, UI behavior, and product additions on top of `dev`.

## Source

- Merged from local `dev`
- Local result on this branch after sync and follow-up doc fix: `36048be`

## What Arrived Through The Sync Chain

The branch absorbed the latest upstream changes through:

1. `upstream/main -> main`
2. `main -> dev`
3. `dev -> spriteClaw-dev`

The upstream range included:

- `v0.3.9` release changes
- channel health diagnostics and gateway recovery updates
- cron agent association updates
- chat history startup retry changes
- Moonshot Global provider support
- Russian localization assets and screenshots
- new E2E and unit tests

The merge from `dev` into this branch completed without manual conflict resolution.

## Variant-Specific Follow-Up Done Here

After the sync, the Russian README brought in from upstream still used `ClawX` branding. This branch added a follow-up documentation commit to align `README.ru-RU.md` with `SpriteClaw` and `indulgeback/BaseClaw`.

## What Variant Developers Should Check First

- channel management flows
- cron forms and agent binding behavior
- startup history recovery
- provider settings and Moonshot-related flows
- Sprite-specific UI surfaces that overlap with shared chat or settings code
- localized README files when upstream adds a new language

## Recommended Workflow For The Next Sync

1. Update `main` from `upstream/main`
2. Merge `main` into `dev`
3. Merge `dev` into the variant branch
4. Review branding, assets, localized docs, and variant-only UX
5. Run at least `pnpm run typecheck`

Reference:

- `docs/branch-strategy.md`

