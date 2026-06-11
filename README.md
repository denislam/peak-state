# Peak State

A minimalist gym + sleep tracker built around a Jeff Nippard UL/PPL hybrid split. Mobile-first, dark mode, persists locally.

## Features

- **Workout tracking** — one-tap check-off per day, day-type-aware (Upper/Lower/Push/Pull/Legs/Rest)
- **Day swap** — tap the day label to change today's workout type (won't affect your weekly plan)
- **Sleep logging** — bedtime, wake time, 1-5 quality rating, plus pre-log bedtime the night before
- **Streaks & stats** — current streak, weekly compliance, 30-day workout count, 30-day average sleep score
- **"Start workout" shortcut** — opens a custom URL you set (Claude chat, YouTube playlist, training app, etc.); configured via the settings gear
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

## Water hydration estimates (optional Claude fallback)

The Water tab's **"+ something else"** field accepts plain descriptions like
`1 cup of non-fat milk` or `12oz smoothie`. A built-in water-content table
(`src/hydration.js`) resolves common drinks instantly and offline. For anything
it doesn't recognize, the app calls a Cloudflare **Pages Function**
(`functions/api/hydration.js`) that asks **Claude Haiku 4.5** to estimate the
water content — the API key stays server-side.

To enable the AI fallback on your deploy:

1. **Add a secret:** Cloudflare dashboard → your Pages project → **Settings →
   Variables and Secrets** → add `ANTHROPIC_API_KEY` (your Anthropic API key),
   scoped to Production.
2. **Enable Node compat:** **Settings → Functions → Compatibility flags** → add
   `nodejs_compat` (the Anthropic SDK needs it).
3. Redeploy.

Without the key the endpoint returns `503` and the app simply asks you to enter
a volume instead — the local table still works. The AI fallback only runs on the
Cloudflare deploy (not on a static-only preview or `npm run dev`).

## Configuration

The "Start workout" button opens any URL you set — a Claude chat, a YouTube playlist, your training app, etc. Tap the gear icon in the top-right of the app and paste a URL. It's stored locally per browser.

## Data

All data is stored in `localStorage` — logs under `daily-logs`, your workout link under `workout-url`. To reset, open DevTools and run:

```js
localStorage.removeItem('daily-logs');
localStorage.removeItem('workout-url');
```

## Roadmap ideas

- Export/import data as JSON
- Optional Cloudflare D1 backend for cross-device sync
- Notes field per day
- Multi-week calendar view
- Sleep duration auto-calculated from bedtime/wake

## License

Personal use, do what you want.
