import type { AppState, DayOfWeek, Exercise, ExerciseLog, WorkoutLog } from "@/types"

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export const WEEK_DAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function dayOfWeek(date = new Date()): DayOfWeek {
  return WEEK_DAYS[(date.getDay() + 6) % 7]
}

/** Monday of the current week, as YYYY-MM-DD */
export function weekStartISO(date = new Date()): string {
  const d = new Date(date)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function fmtKg(kg: number): string {
  return kg % 1 === 0 ? String(kg) : kg.toFixed(1)
}

/** Planned weight for set `i`: the saved per-set shape, else the flat weight. */
export function plannedSetWeight(exercise: Exercise, i: number): number {
  return exercise.setWeightsKg?.[i] ?? exercise.weightKg
}

/** The full planned weight column for an exercise, one entry per set. */
export function plannedWeights(exercise: Exercise): number[] {
  return Array.from({ length: exercise.sets }, (_, i) => plannedSetWeight(exercise, i))
}

/**
 * Normalise a weight column into what the template should store: a flat
 * `weightKg` when every set matches, plus the per-set array only when they
 * differ. `weightKg` is always the heaviest entry so progression keeps
 * reading a single meaningful working weight.
 */
export function weightPatch(weights: number[]): { weightKg: number; setWeightsKg?: number[] } {
  const top = weights.length > 0 ? Math.max(...weights) : 0
  const flat = weights.every((w) => w === top)
  return { weightKg: top, setWeightsKg: flat ? undefined : [...weights] }
}

/** Compare two weight columns — used to decide whether there's anything to save. */
export function sameWeights(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((w, i) => w === b[i])
}

export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function completionPercent(
  exercises: ExerciseLog[],
  cardio?: { done: boolean },
): number {
  const total = exercises.reduce((n, e) => n + e.sets.length, 0) + (cardio ? 1 : 0)
  if (total === 0) return 0
  const done =
    exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0) +
    (cardio?.done ? 1 : 0)
  return Math.round((done / total) * 100)
}

export const CARDIO_LABELS: Record<"walk" | "run", string> = {
  walk: "Walk",
  run: "Run",
}

export const CATEGORY_LABELS: Record<string, string> = {
  strength: "Strength",
  hypertrophy: "Hypertrophy",
  classics: "Classics",
  minimalist: "Minimalist",
  recovery: "Recovery",
}

export function logsThisWeek(logs: WorkoutLog[]): WorkoutLog[] {
  const start = weekStartISO()
  return logs.filter((l) => l.date >= start)
}

export const BAR_KG = 20
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5]

/**
 * Plates per side for a barbell load. null = below bar weight or not
 * loadable with standard plates.
 */
export function platesPerSide(totalKg: number, barKg = BAR_KG): number[] | null {
  if (totalKg < barKg) return null
  let remaining = (totalKg - barKg) / 2
  const plates: number[] = []
  for (const p of PLATES_KG) {
    while (remaining >= p - 1e-9) {
      plates.push(p)
      remaining -= p
    }
  }
  return remaining > 1e-9 ? null : plates
}

export function downloadBackup(state: AppState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `repforge-backup-${todayISO()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
