# Repforge

Workout tracker PWA, live at https://iemmolo.github.io/repforge/. Push to
`main` auto-deploys via GitHub Pages Actions; installed PWAs pick updates
up on launch or within an hour.

## Architecture

- React 19 + Vite 7 + Tailwind 4 (CSS-first, tokens in `src/index.css`),
  TypeScript, hash router, no component library. **Keep Vite at 7** —
  Vite 8/rolldown's native binding fails on Node < 22.12.
- All state in one localStorage key `repforge:v1`, managed by a reducer in
  `src/lib/store.tsx`. Types in `src/types.ts`. No backend.
- Preset programs live in `src/lib/seed.ts` (`PRESET_PROGRAMS`); stored
  copies in localStorage only update via the in-app Restore/Load-presets
  buttons, so seed edits don't reach existing browsers automatically.
- Programs are `weekly` (day → workout map) or `cycle` (workouts rotate in
  array order; `nextCycleWorkout` in store.tsx picks Today's).
- Progression suggestions (`src/lib/progression.ts`) fire when the last log
  hit every set at target reps/weight; dismissals stored by suggestion key.
- Gamification in `src/lib/gamify.ts`: weekly streak (rest-day friendly),
  16-week heatmap, PR detection (drives the confetti Celebration on finish),
  badges — all recomputed from logs, nothing stored.
- Quick-logged cardio uses `programId: ""` and is excluded from weekly
  adherence counts.

## Conventions

- Seed content is generic — exercise notes may only be program rules
  ("one heavy set only") or mechanics ("per dumbbell", "reps = seconds"),
  never editorial coaching advice.
- Presets stay faithful to their published source programs; verify details
  against sources before adding new ones.
- The industrial carbon/volt aesthetic (Anton + Barlow + IBM Plex Mono) is
  intentional and stays.
- Mobile-first: big tap targets, steppers everywhere (tap the number to
  type an exact value).

## Verify changes

`npm run build` (tsc + vite). Dev: `npm run dev` → /repforge/ path.
