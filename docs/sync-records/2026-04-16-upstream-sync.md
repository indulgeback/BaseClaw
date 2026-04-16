# 2026-04-16 Sync Record

## Branch

`dev`

## Purpose

This branch is the BaseClaw shared layer. It sits between the upstream mirror branch and each variant branch.

Use this branch for:

- BaseClaw-wide branding
- shared scripts and tooling
- shared infrastructure for all variants
- fixes that should benefit every downstream variant

Do not use this branch for a single variant's custom UI, assets, or product behavior.

## Source

- Merged from local `main`
- Local result on this branch: `cef1ba1`

## What Was Absorbed From Main

This sync brought the latest upstream `ClawX/main` updates into `dev`, including:

- `v0.3.9` release changes
- channel health diagnostics and gateway recovery updates
- cron agent association updates
- chat history startup retry changes
- Moonshot Global provider support
- Russian localization assets and screenshots
- new E2E and unit tests

The merge completed without manual conflict resolution.

## What Dev Owners Should Review First

- shared provider registry changes
- channel and cron behavior changes
- gateway diagnostics additions
- new tests that may need to be preserved in downstream branches

## Next Step In The Branch Chain

After updating `dev`, each variant branch should merge `dev` and then review:

- branding files
- custom assets
- variant-specific UI
- variant-only docs

Reference:

- `docs/branch-strategy.md`

