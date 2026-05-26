# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
