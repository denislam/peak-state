# Peak State

A minimalist gym + sleep tracker built around a Jeff Nippard UL/PPL hybrid split. Mobile-first, dark mode, persists locally.

## Features

- **Workout tracking** — one-tap check-off per day, day-type-aware (Upper/Lower/Push/Pull/Legs/Rest)
- **Day swap** — tap the day label to change today's workout type (won't affect your weekly plan)
- **Sleep logging** — bedtime, wake time, 1-5 quality rating, plus pre-log bedtime the night before
- **Streaks & stats** — current streak, weekly compliance, 30-day workout count, 30-day average sleep score
- **"Start workout" shortcut** — opens a pre-configured Claude chat to guide your session
- **Local-only data** — nothing leaves your device (uses `localStorage`)

## Stack

- Vite + React
- Tailwind CSS
- lucide-react (icons)

## Local development

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Deploy to Cloudflare Pages

1. Push this repo to GitHub.
2. In the Cloudflare dashboard: **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Pick the `peak-state` repo.
4. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** 20 (set via `NODE_VERSION` env var if needed)
5. Save and deploy. You'll get a `peak-state.pages.dev` URL — add it to your phone's home screen for app-like access.

## Configuration

The "Start workout" button opens a specific Claude chat URL. To change it, edit `src/config.js`:

```js
export const CLAUDE_CHAT_URL = 'https://claude.ai/chat/YOUR-CHAT-ID';
export const WORKOUT_PROMPT = "Start today's workout";
```

## Data

All data is stored in `localStorage` under the key `daily-logs`. To reset, open DevTools and run:

```js
localStorage.removeItem('daily-logs');
```

## Roadmap ideas

- Export/import data as JSON
- Optional Cloudflare D1 backend for cross-device sync
- Notes field per day
- Multi-week calendar view
- Sleep duration auto-calculated from bedtime/wake

## License

Personal use, do what you want.
