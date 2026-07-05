import type { AppState, Exercise, Program } from "@/types"

function ex(
  name: string,
  sets: number,
  targetReps: number,
  weightKg: number,
  incrementKg: number,
  restSeconds: number,
  notes?: string,
): Exercise {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return { id, name, sets, targetReps, weightKg, incrementKg, restSeconds, notes }
}

/** A timed hold (plank, hollow hold): targetReps is seconds, no load. */
function hold(name: string, sets: number, seconds: number, restSeconds: number, notes?: string): Exercise {
  return { ...ex(name, sets, seconds, 0, 0, restSeconds, notes), mode: "time" }
}

// ————————————————————————————————— Strength

const foundationStrength: Program = {
  id: "foundation-strength",
  name: "Foundation Strength",
  tagline: "Progressive overload on the big lifts, three days a week.",
  category: "strength",
  schedule: {
    monday: "fs-a",
    wednesday: "fs-b",
    friday: "fs-c",
  },
  workouts: [
    {
      id: "fs-a",
      name: "A — Squat & Press",
      exercises: [
        ex("Barbell Squat", 4, 6, 60, 2.5, 180),
        ex("Bench Press", 4, 8, 50, 2.5, 150),
        ex("Cable Row", 3, 10, 40, 2.5, 120),
        ex("Lateral Raise", 3, 15, 5, 1, 60),
        hold("Plank", 3, 45, 60),
      ],
    },
    {
      id: "fs-b",
      name: "B — Hinge & Pull",
      exercises: [
        ex("Romanian Deadlift", 4, 8, 60, 2.5, 180),
        ex("Incline DB Press", 3, 10, 16, 2, 120, "Per dumbbell"),
        ex("Lat Pulldown", 3, 10, 45, 2.5, 120),
        ex("Face Pull", 3, 15, 10, 1, 60),
        ex("Tricep Pushdown", 3, 12, 20, 2.5, 90),
      ],
    },
    {
      id: "fs-c",
      name: "C — Legs & Row",
      exercises: [
        ex("Leg Press", 4, 10, 100, 5, 150),
        ex("Landmine Press", 3, 10, 20, 2.5, 120),
        ex("Barbell Row", 4, 8, 50, 2.5, 150),
        ex("Leg Curl", 3, 12, 30, 2.5, 90),
        ex("DB Bicep Curl", 3, 12, 10, 1, 90, "Per dumbbell"),
      ],
    },
  ],
}

// Inspired by StrongLifts 5x5: two workouts rotating A/B/A, B/A/B on three
// training days. +2.5kg every session (deadlift +5kg).
const linear5x5: Program = {
  id: "linear-5x5",
  name: "5×5 Linear",
  tagline: "StrongLifts-style. A and B alternate — Today always knows which is next.",
  category: "strength",
  scheduleMode: "cycle",
  daysPerWeek: 3,
  schedule: {},
  workouts: [
    {
      id: "5x5-a",
      name: "Workout A",
      exercises: [
        ex("Barbell Squat", 5, 5, 40, 2.5, 180, "Start light — the weight climbs fast"),
        ex("Bench Press", 5, 5, 30, 2.5, 180),
        ex("Barbell Row", 5, 5, 30, 2.5, 180),
      ],
    },
    {
      id: "5x5-b",
      name: "Workout B",
      exercises: [
        ex("Barbell Squat", 5, 5, 40, 2.5, 180, "Start light — the weight climbs fast"),
        ex("Overhead Press", 5, 5, 20, 2.5, 180, "Start with the empty bar"),
        ex("Deadlift", 1, 5, 60, 5, 180, "One heavy set only"),
      ],
    },
  ],
}

// Inspired by GZCLP: four workouts rotating over three training days.
// Each day: heavy T1 (5x3), volume T2 (3x10), pump T3 (3x15).
const gzclp: Program = {
  id: "gzclp-3day",
  name: "GZCLP Tiers",
  tagline: "GZCLP-inspired. Four workouts rotate over your three gym days.",
  category: "strength",
  scheduleMode: "cycle",
  daysPerWeek: 3,
  schedule: {},
  workouts: [
    {
      id: "gz-a1",
      name: "A1 — Squat heavy",
      exercises: [
        ex("Barbell Squat", 5, 3, 60, 2.5, 180, "T1"),
        ex("Bench Press", 3, 10, 40, 2.5, 120, "T2"),
        ex("Lat Pulldown", 3, 15, 35, 2.5, 90, "T3"),
        ex("Face Pull", 3, 15, 10, 1, 60),
      ],
    },
    {
      id: "gz-a2",
      name: "A2 — Press heavy",
      exercises: [
        ex("Overhead Press", 5, 3, 25, 2.5, 180, "T1"),
        ex("Deadlift", 3, 10, 60, 5, 150, "T2"),
        ex("Cable Row", 3, 15, 30, 2.5, 90, "T3"),
        ex("Lateral Raise", 3, 15, 5, 1, 60),
      ],
    },
    {
      id: "gz-b1",
      name: "B1 — Bench heavy",
      exercises: [
        ex("Bench Press", 5, 3, 50, 2.5, 180, "T1"),
        ex("Barbell Squat", 3, 10, 45, 2.5, 150, "T2"),
        ex("Barbell Row", 3, 15, 35, 2.5, 90, "T3"),
        ex("DB Bicep Curl", 3, 15, 8, 1, 60, "Per dumbbell"),
      ],
    },
    {
      id: "gz-b2",
      name: "B2 — Deadlift heavy",
      exercises: [
        ex("Deadlift", 5, 3, 80, 5, 180, "T1"),
        ex("Overhead Press", 3, 10, 20, 2.5, 150, "T2"),
        ex("Lat Pulldown", 3, 15, 35, 2.5, 90, "T3"),
        ex("Face Pull", 3, 15, 10, 1, 60),
      ],
    },
  ],
}

// ————————————————————————————————— Hypertrophy

const volumeBlock: Program = {
  id: "volume-block",
  name: "Volume Block",
  tagline: "Hypertrophy focus. Higher reps, shorter rests, more pump.",
  category: "hypertrophy",
  schedule: {
    monday: "vb-push",
    wednesday: "vb-pull",
    friday: "vb-legs",
  },
  workouts: [
    {
      id: "vb-push",
      name: "Push Emphasis",
      exercises: [
        ex("DB Bench Press", 4, 10, 20, 2, 90, "Per dumbbell"),
        ex("Machine Shoulder Press", 3, 12, 25, 2.5, 90),
        ex("Cable Fly", 3, 15, 12, 1, 75),
        ex("Lateral Raise", 4, 15, 5, 1, 60),
        ex("Tricep Rope Pushdown", 3, 12, 18, 2.5, 75),
        ex("Leg Extension", 3, 15, 35, 2.5, 75),
      ],
    },
    {
      id: "vb-pull",
      name: "Pull Emphasis",
      exercises: [
        ex("Lat Pulldown", 4, 10, 45, 2.5, 90),
        ex("Seated Row", 4, 12, 45, 2.5, 90),
        ex("Face Pull", 4, 15, 10, 1, 60),
        ex("Rear Delt Fly", 3, 15, 6, 1, 60),
        ex("DB Bicep Curl", 3, 12, 10, 1, 75, "Per dumbbell"),
        ex("Hammer Curl", 3, 12, 10, 1, 75, "Per dumbbell"),
      ],
    },
    {
      id: "vb-legs",
      name: "Legs & Core",
      exercises: [
        ex("Leg Press", 4, 12, 90, 5, 120),
        ex("Leg Curl", 4, 12, 30, 2.5, 90),
        ex("Bulgarian Split Squat", 3, 10, 8, 1, 90, "Per dumbbell, per leg"),
        ex("Calf Raise", 4, 15, 40, 5, 60),
        ex("Cable Crunch", 3, 15, 25, 2.5, 60),
        hold("Plank", 3, 45, 60),
      ],
    },
  ],
}

// Inspired by PHUL: 4-day upper/lower, power first half of the week,
// hypertrophy the second.
const phul: Program = {
  id: "phul",
  name: "PHUL Upper/Lower",
  tagline: "4 days. Heavy upper & lower early in the week, volume later.",
  category: "hypertrophy",
  schedule: {
    monday: "phul-up",
    tuesday: "phul-lp",
    thursday: "phul-uh",
    friday: "phul-lh",
  },
  workouts: [
    {
      id: "phul-up",
      name: "Upper Power",
      exercises: [
        ex("Bench Press", 4, 5, 50, 2.5, 180),
        ex("Barbell Row", 4, 5, 50, 2.5, 180),
        ex("Overhead Press", 3, 8, 25, 2.5, 120),
        ex("Lat Pulldown", 3, 8, 45, 2.5, 120),
        ex("Barbell Curl", 2, 8, 20, 2.5, 90),
        ex("Tricep Pushdown", 2, 8, 22.5, 2.5, 90),
      ],
    },
    {
      id: "phul-lp",
      name: "Lower Power",
      exercises: [
        ex("Barbell Squat", 4, 5, 60, 2.5, 180),
        ex("Deadlift", 3, 5, 70, 5, 180),
        ex("Leg Press", 4, 10, 100, 5, 120),
        ex("Leg Curl", 3, 8, 30, 2.5, 90),
        ex("Calf Raise", 4, 8, 40, 5, 60),
      ],
    },
    {
      id: "phul-uh",
      name: "Upper Hypertrophy",
      exercises: [
        ex("Incline DB Press", 4, 10, 14, 2, 90, "Per dumbbell"),
        ex("Cable Fly", 3, 12, 10, 1, 75),
        ex("Seated Row", 4, 10, 40, 2.5, 90),
        ex("Face Pull", 3, 15, 10, 1, 60),
        ex("Lateral Raise", 3, 12, 5, 1, 60),
        ex("Hammer Curl", 3, 12, 10, 1, 75, "Per dumbbell"),
      ],
    },
    {
      id: "phul-lh",
      name: "Lower Hypertrophy",
      exercises: [
        ex("Leg Press", 4, 12, 90, 5, 120),
        ex("Romanian Deadlift", 3, 10, 55, 2.5, 120),
        ex("Leg Extension", 3, 12, 35, 2.5, 75),
        ex("Leg Curl", 3, 12, 30, 2.5, 75),
        ex("Calf Raise", 4, 12, 35, 5, 60),
        ex("Cable Crunch", 3, 15, 25, 2.5, 60),
      ],
    },
  ],
}

// Inspired by the Reddit PPL (Metallicadpa): six workouts rotating
// pull/push/legs twice through, ideally six days a week.
const redditPPL: Program = {
  id: "reddit-ppl",
  name: "Reddit PPL",
  tagline: "The r/fitness classic. Six rotating workouts — big commitment, big payoff.",
  category: "hypertrophy",
  scheduleMode: "cycle",
  daysPerWeek: 6,
  schedule: {},
  workouts: [
    {
      id: "ppl-pull-a",
      name: "Pull A — Deadlift",
      exercises: [
        ex("Deadlift", 1, 5, 80, 5, 180, "One heavy set"),
        ex("Lat Pulldown", 3, 10, 45, 2.5, 90),
        ex("Seated Row", 3, 10, 45, 2.5, 90),
        ex("Face Pull", 4, 15, 10, 1, 60),
        ex("DB Bicep Curl", 4, 10, 10, 1, 75, "Per dumbbell"),
      ],
    },
    {
      id: "ppl-push-a",
      name: "Push A — Bench",
      exercises: [
        ex("Bench Press", 4, 5, 50, 2.5, 180),
        ex("DB Shoulder Press", 3, 10, 12, 1, 90, "Per dumbbell"),
        ex("Incline DB Press", 3, 10, 14, 2, 90, "Per dumbbell"),
        ex("Tricep Pushdown", 3, 10, 20, 2.5, 75),
        ex("Lateral Raise", 3, 15, 5, 1, 60),
      ],
    },
    {
      id: "ppl-legs-a",
      name: "Legs A — Squat",
      exercises: [
        ex("Barbell Squat", 4, 5, 60, 2.5, 180),
        ex("Romanian Deadlift", 3, 10, 55, 2.5, 120),
        ex("Leg Press", 3, 10, 100, 5, 120),
        ex("Leg Curl", 3, 10, 30, 2.5, 90),
        ex("Calf Raise", 5, 10, 40, 5, 60),
      ],
    },
    {
      id: "ppl-pull-b",
      name: "Pull B — Row",
      exercises: [
        ex("Barbell Row", 4, 5, 50, 2.5, 180),
        ex("Lat Pulldown", 3, 10, 45, 2.5, 90),
        ex("Cable Row", 3, 10, 40, 2.5, 90),
        ex("Face Pull", 4, 15, 10, 1, 60),
        ex("Barbell Curl", 4, 10, 20, 2.5, 75),
      ],
    },
    {
      id: "ppl-push-b",
      name: "Push B — Press",
      exercises: [
        ex("Overhead Press", 4, 5, 25, 2.5, 180),
        ex("Bench Press", 3, 10, 40, 2.5, 120),
        ex("Incline DB Press", 3, 10, 14, 2, 90, "Per dumbbell"),
        ex("Lateral Raise", 3, 15, 5, 1, 60),
        ex("Tricep Rope Pushdown", 3, 10, 18, 2.5, 75),
      ],
    },
    {
      id: "ppl-legs-b",
      name: "Legs B — Volume",
      exercises: [
        ex("Barbell Squat", 3, 10, 50, 2.5, 150),
        ex("Leg Press", 3, 12, 90, 5, 120),
        ex("Leg Extension", 3, 12, 35, 2.5, 75),
        ex("Leg Curl", 3, 10, 30, 2.5, 75),
        ex("Calf Raise", 5, 10, 40, 5, 60),
      ],
    },
  ],
}

// ————————————————————————————————— Classics

// Inspired by Arnold Schwarzenegger's Golden Six (1966): one full-body
// workout, three times a week, six exercises. Behind-the-neck press swapped
// for a DB shoulder press — the original is hard on shoulders.
const goldenSix: Program = {
  id: "golden-six",
  name: "Golden Six",
  tagline: "Arnold's 1966 classic. One workout, six lifts, three times a week.",
  category: "classics",
  schedule: {
    monday: "g6",
    wednesday: "g6",
    friday: "g6",
  },
  workouts: [
    {
      id: "g6",
      name: "The Golden Six",
      exercises: [
        ex("Barbell Squat", 4, 10, 40, 2.5, 120, "Arnold's rule: 2 min rest on squats only"),
        ex("Wide-Grip Bench Press", 3, 10, 40, 2.5, 90),
        ex("Chin-up", 3, 8, 0, 0, 90, "Max reps each set — 8 is the score to beat"),
        ex("DB Shoulder Press", 4, 10, 12, 1, 90, "Per dumbbell. Sub for the original behind-the-neck press — safer for most shoulders"),
        ex("Barbell Curl", 3, 10, 20, 2.5, 90),
        ex("Bent-Knee Sit-up", 3, 20, 0, 0, 60, "Max reps — 20 is the score to beat"),
      ],
    },
  ],
}

// Inspired by the classic Arnold Split: three workouts, each hit twice a
// week over six days. Volume bodybuilding, old school.
const arnoldSplit: Program = {
  id: "arnold-split",
  name: "Arnold Split",
  tagline: "Chest & back, shoulders & arms, legs — each twice a week. Six days.",
  category: "classics",
  schedule: {
    monday: "as-cb",
    tuesday: "as-sa",
    wednesday: "as-legs",
    thursday: "as-cb",
    friday: "as-sa",
    saturday: "as-legs",
  },
  workouts: [
    {
      id: "as-cb",
      name: "Chest & Back",
      exercises: [
        ex("Bench Press", 4, 8, 50, 2.5, 120),
        ex("Incline DB Press", 3, 10, 14, 2, 90, "Per dumbbell"),
        ex("Cable Fly", 3, 12, 10, 1, 75),
        ex("Barbell Row", 4, 8, 50, 2.5, 120),
        ex("Lat Pulldown", 3, 10, 45, 2.5, 90),
      ],
    },
    {
      id: "as-sa",
      name: "Shoulders & Arms",
      exercises: [
        ex("DB Shoulder Press", 4, 8, 12, 1, 90, "Per dumbbell"),
        ex("Lateral Raise", 4, 12, 5, 1, 60),
        ex("Rear Delt Fly", 3, 12, 6, 1, 60),
        ex("Face Pull", 3, 15, 10, 1, 60),
        ex("Barbell Curl", 4, 10, 20, 2.5, 75),
        ex("Tricep Pushdown", 4, 10, 20, 2.5, 75),
      ],
    },
    {
      id: "as-legs",
      name: "Legs",
      exercises: [
        ex("Barbell Squat", 4, 10, 50, 2.5, 150),
        ex("Leg Press", 4, 12, 90, 5, 120),
        ex("Romanian Deadlift", 3, 10, 55, 2.5, 120),
        ex("Leg Curl", 3, 12, 30, 2.5, 75),
        ex("Calf Raise", 5, 12, 40, 5, 60),
      ],
    },
  ],
}

// ————————————————————————————————— Minimalist

// Inspired by Pavel's Kettlebell Simple & Sinister: 100 one-arm swings and
// 10 get-ups, done most days. Progression is by whole bell sizes when every
// set feels crisp — deliberately not wired to the auto-progression engine.
const simpleAndSinister: Program = {
  id: "simple-sinister",
  name: "Simple & Sinister",
  tagline: "Pavel's kettlebell daily practice. Swing, get up, repeat. Rest when you need it.",
  category: "minimalist",
  schedule: {
    monday: "ss",
    tuesday: "ss",
    wednesday: "ss",
    thursday: "ss",
    friday: "ss",
    saturday: "ss",
  },
  workouts: [
    {
      id: "ss",
      name: "Swings & Get-ups",
      exercises: [
        ex("One-Arm Kettlebell Swing", 10, 10, 16, 0, 60, "Switch hands each set. Move up a bell size (+4kg) when all 100 feel crisp"),
        ex("Turkish Get-Up", 10, 1, 8, 0, 60, "1 rep per set, alternate sides"),
      ],
    },
  ],
}

// Inspired by the r/bodyweightfitness Recommended Routine: 3-day full body,
// no equipment beyond a bar. Progress by harder variations, not weight.
const bodyweightBasics: Program = {
  id: "bodyweight-basics",
  name: "Bodyweight Basics",
  tagline: "RR-inspired. No gym needed — progress by harder variations, not weight.",
  category: "minimalist",
  schedule: {
    monday: "bw-1",
    wednesday: "bw-1",
    friday: "bw-1",
  },
  workouts: [
    {
      id: "bw-1",
      name: "Full Body",
      exercises: [
        ex("Pull-up", 3, 5, 0, 0, 120, "Too hard? Negatives or band-assisted"),
        ex("Push-up", 3, 8, 0, 0, 120, "Too easy? Diamond or decline"),
        ex("Inverted Row", 3, 8, 0, 0, 120, "Feet further forward = harder"),
        ex("Dip", 3, 8, 0, 0, 120),
        ex("Split Squat", 3, 8, 0, 0, 90, "Per leg. Too easy? Rear-foot elevated"),
        hold("Plank", 3, 45, 60),
      ],
    },
  ],
}

// ————————————————————————————————— Recovery

const deloadWeek: Program = {
  id: "deload-week",
  name: "Deload Week",
  tagline: "Run every 4–6 weeks or when beat up. ~60% loads, easy pace.",
  category: "recovery",
  schedule: {
    monday: "dl-1",
    wednesday: "dl-2",
    friday: "dl-3",
  },
  workouts: [
    {
      id: "dl-1",
      name: "Light Full Body 1",
      exercises: [
        ex("Goblet Squat", 3, 12, 16, 0, 90),
        ex("Machine Chest Press", 2, 12, 25, 0, 90),
        ex("Cable Row", 2, 12, 25, 0, 90),
        ex("Band External Rotation", 3, 15, 0, 0, 45),
        hold("Plank", 2, 30, 60),
      ],
      cardio: { type: "walk", minutes: 20 },
    },
    {
      id: "dl-2",
      name: "Light Full Body 2",
      exercises: [
        ex("Leg Press", 3, 12, 60, 0, 90),
        ex("Lat Pulldown", 2, 12, 30, 0, 90),
        ex("Incline DB Press", 2, 12, 10, 0, 90, "Per dumbbell"),
        ex("Face Pull", 3, 15, 8, 0, 45),
        ex("Farmer Carry", 2, 40, 16, 0, 90, "Reps = metres, per hand"),
      ],
      cardio: { type: "walk", minutes: 20 },
    },
    {
      id: "dl-3",
      name: "Light Full Body 3",
      exercises: [
        ex("Leg Curl", 3, 12, 20, 0, 75),
        ex("Seated Row", 2, 12, 30, 0, 90),
        ex("Landmine Press", 2, 12, 12, 0, 90),
        ex("Lateral Raise", 2, 15, 4, 0, 45),
        ex("Stretching Circuit", 1, 10, 0, 0, 0, "Reps = minutes. Hips, chest, lats"),
      ],
      cardio: { type: "walk", minutes: 20 },
    },
  ],
}

export const PRESET_PROGRAMS: Program[] = [
  foundationStrength,
  linear5x5,
  gzclp,
  volumeBlock,
  phul,
  redditPPL,
  goldenSix,
  arnoldSplit,
  simpleAndSinister,
  bodyweightBasics,
  deloadWeek,
]

export const PRESET_BY_ID = new Map(PRESET_PROGRAMS.map((p) => [p.id, p]))

export function seedState(): AppState {
  return {
    version: 1,
    programs: PRESET_PROGRAMS,
    activeProgramId: foundationStrength.id,
    logs: [],
    session: null,
    onboarded: false,
  }
}
