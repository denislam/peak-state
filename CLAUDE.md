# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies
- `npm run dev` — Vite dev server at `http://localhost:5173`
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the built `dist/` locally

No test runner, linter, or formatter is configured.

## Architecture

Single-page React + Vite app. Mobile-first gym + sleep tracker. All state is held in `App.jsx` and persisted to `localStorage`.

### Data model

A single `localStorage` key (`daily-logs`, defined in `src/storage.js`) stores an object keyed by `YYYY-MM-DD`. Each entry is a `log` with optional fields:

- `workout` (bool) — checked off for the day
- `bedtime`, `waketime` (HH:MM strings)
- `sleepQuality` (1–5)
- `dayTypeOverride` (key into `DAY_TYPES`, or null) — per-date override of the weekly plan

`storage.js` exposes an async `getLogs` / `setLogs` API specifically so a future Cloudflare D1/KV backend can be dropped in without changing call sites — preserve this shape.

### Day-type resolution

`DEFAULT_SCHEDULE` (`src/config.js`) maps weekday index (0=Sun … 6=Sat) → key in `DAY_TYPES` (`src/schedule.js`). `App.jsx#getDayInfo` resolves the effective type for a date: per-day `dayTypeOverride` wins over the weekly default. The override is intentionally a one-off — it does **not** mutate `DEFAULT_SCHEDULE`. The "modified" badge and amber dot in the weekly grid both key off `isOverridden`.

Editing the workout plan = edit `DAY_TYPES` in `src/schedule.js` (exercises, colors) and/or `DEFAULT_SCHEDULE` in `src/config.js` (which day-type runs on each weekday). The values in `DEFAULT_SCHEDULE` must be keys present in `DAY_TYPES`.

### Stats

Computed on every render from `logs` in `App.jsx`:

- `calcStreak` — walks backward day-by-day; rest days count, missed workout days break the streak. Special-cases "today's workout not yet done" so the streak isn't lost mid-day.
- `weekStats` — current week's workout compliance using `startOfWeek` (Sunday-based, see `dateUtils.js`).
- `monthStats` — last 30 days: workout count + average sleep quality.

### Workout launcher

`launchWorkout` opens the user-configured `workoutUrl` (set via the settings gear → bottom-sheet) in a new tab with `noopener,noreferrer`. The URL is stored under its own `localStorage` key (`workout-url`) via `storage.getWorkoutUrl` / `storage.setWorkoutUrl` — same async shape as the logs API so it can move to a network backend later. When no URL is set, the "Start workout" button is replaced with a "Set workout link" button that opens the settings sheet.

## Conventions & gotchas

- **Tailwind classes are referenced as strings inside `DAY_TYPES`** (`accent`, `text`). Tailwind's JIT scans `./index.html` and `./src/**/*.{js,jsx}` (per `tailwind.config.js`) so these literal class strings get picked up — don't dynamically build them with concatenation, or they won't survive purge.
- **PostCSS config filename has a typo**: `postcss.cconfig.js` (double `c`). PostCSS won't auto-load it; tailwind's `@tailwind` directives in `src/index.css` depend on this config running. If you touch the build pipeline or notice unstyled output, rename to `postcss.config.js`.
- **Date keying is local-time**, not UTC (`dateUtils.js#dateKey`). Preserve this — switching to ISO/UTC would silently shift every existing user's log keys.
- Loading the initial logs has a **2.5s timeout** in `App.jsx`'s effect; this exists to handle a hung async storage backend (so the UI doesn't get stuck on "Loading…" forever once `storage` is swapped for a network-backed implementation). Keep it when modifying the load flow.
- Future dates have a different UX path: workout check-off is disabled, sleep quality input is hidden, sleep card label changes to "Tonight's sleep" / "Planned sleep". When adding card features, check `isFuture` / `isToday` branching in `App.jsx`.
