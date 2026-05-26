# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-05-25

### Fixed
- iPhone Safari layout for the bedtime / wake time inputs in the sleep card:
  - Reset `::-webkit-date-and-time-value` and `::-webkit-datetime-edit` so the native time picker stops imposing an intrinsic min-width that overflowed the two-column grid (bedtime overlapped wake; wake clipped the card's right padding).
  - Tightened grid gap and added `min-w-0` so the grid cells can shrink below their content size.
  - Locked the inputs to `h-12` so an empty time field no longer renders shorter than a populated one, and the input height matches the `py-3` sleep-rating buttons directly below.

## [1.0.2] - 2026-05-25

### Changed
- Switched SPA fallback routing from `public/_redirects` to a `wrangler.jsonc` with `assets.not_found_handling: "single-page-application"`. Cloudflare Workers' validator rejected the `/*  /index.html  200` rule as a self-referential loop on deploy.

## [1.0.1] - 2026-05-25

### Changed
- Bumped Vite from `^5.3.1` to `^6.0.0` so Cloudflare's Vite framework adapter can auto-configure the deploy (it rejects Vite < 6).

## [1.0.0] - 2026-05-25

### Added
- Daily workout check-off with streak tracking (rest days preserve streaks; today's incomplete workout doesn't break the streak mid-day).
- Sleep logging: bedtime, wake time, and 1–5 sleep quality rating.
- Weekly schedule driven by `DEFAULT_SCHEDULE` mapped to `DAY_TYPES`, with per-date overrides and a "modified" badge.
- Stats: current streak, this week's workout compliance, and 30-day workout count plus average sleep quality.
- Configurable workout launcher — set a custom start link from the settings sheet; opens in a new tab with `noopener,noreferrer`.
- Future-date UX: check-off disabled, sleep quality hidden, sleep card relabeled to "Tonight's sleep" / "Planned sleep".
- `localStorage` persistence via an async `getLogs` / `setLogs` API designed to swap in a network backend later.
