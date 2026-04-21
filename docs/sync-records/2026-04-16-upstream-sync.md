# 2026-04-16 Sync Record

## Branch

`main`

## Purpose

This branch remains the upstream mirror branch for BaseClaw. It should only absorb upstream `ClawX/main` changes and should not carry BaseClaw or variant-specific customization.

## Source

- Upstream remote: `https://github.com/ValueCell-ai/ClawX.git`
- Upstream branch: `main`
- Local result on this branch: `2fefbf3`

## What Was Synced

This sync moved `main` forward from `fc9e37c` to `2fefbf3`.

The upstream range included:

- `v0.3.9` release changes
- channel health diagnostics and gateway recovery updates
- cron agent association updates
- chat history startup retry changes
- Moonshot Global provider support
- Russian localization assets and screenshots
- new E2E and unit tests

## Notes For Maintainers

- Do not add branding changes on `main`.
- Do not add variant files on `main`.
- If a future sync conflicts here, treat it as a warning sign that custom changes leaked into the mirror branch.

## Next Step In The Branch Chain

After updating `main`, merge `main` into `dev`.

Reference:

- `docs/branch-strategy.md`

