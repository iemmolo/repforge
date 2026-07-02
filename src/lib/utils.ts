import type { DayOfWeek, ExerciseLog, WorkoutLog } from "@/types"

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
