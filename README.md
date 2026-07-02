# REPFORGE

Personal workout tracker PWA. Successor to `fitness-tracker`, rebuilt around
selectable training programs instead of a single hardcoded plan.

## Features

- **Programs** — multiple training programs (Foundation Strength, Volume Block,
  Deload Week seeded); one is active and drives the weekly schedule, but any
  workout can be started ad-hoc. Full in-app editor: create, duplicate, and
  edit programs, workouts, exercises, and the day-of-week schedule.
- **Log by exception** — every set is pre-filled with target reps and weight;
  you only adjust when you deviate, then tap the check.
- **Rest timer** — checking off a set starts that exercise's rest countdown,
  with +30s, skip, chime, and vibration.
- **Progression suggestions** — hit every set of an exercise at target reps
  and weight, and the home screen suggests the next increment ("Apply all"
  writes it into the program).
- **History & progress** — per-workout logs, and per-exercise top-set /
  volume charts.
- **Backup** — export/import all data as JSON (everything lives in
  localStorage; there is no backend).

## Stack

React 19 · Vite 7 · Tailwind 4 · TypeScript · vite-plugin-pwa. No component
library — the UI is custom (Anton / Barlow / IBM Plex Mono, carbon + volt).

## Development

```sh
npm install
npm run dev        # local dev server
npm run build      # type-check + production build
node scripts/make-icons.mjs   # regenerate PWA icons
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
