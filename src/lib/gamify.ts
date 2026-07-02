import type { Session, WorkoutLog } from "@/types"
import { todayISO, weekStartISO } from "@/lib/utils"

function dateFrom(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d, 12)
}

function shiftDays(iso: string, days: number): string {
  const d = dateFrom(iso)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Sessions (not quick cardio) per week, keyed by Monday's date. */
function sessionsByWeek(logs: WorkoutLog[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const l of logs) {
    if (l.programId === "") continue
    const ws = weekStartISO(dateFrom(l.date))
    counts.set(ws, (counts.get(ws) ?? 0) + 1)
  }
  return counts
}

export interface StreakInfo {
  weeks: number // completed consecutive weeks at/above target (incl. this week once hit)
  thisWeekCount: number
  thisWeekHit: boolean
}

/**
 * Consecutive weeks hitting the session target, counting back from this week
 * if it's already hit, otherwise from last week (an in-progress week never
 * breaks the streak).
 */
export function weeklyStreak(logs: WorkoutLog[], target: number): StreakInfo {
  const counts = sessionsByWeek(logs)
  const thisWeek = weekStartISO()
  const thisWeekCount = counts.get(thisWeek) ?? 0
  const thisWeekHit = thisWeekCount >= target
  let cursor = thisWeekHit ? thisWeek : shiftDays(thisWeek, -7)
  let weeks = 0
  while ((counts.get(cursor) ?? 0) >= target) {
    weeks++
    cursor = shiftDays(cursor, -7)
  }
  return { weeks, thisWeekCount, thisWeekHit }
}

/** 0 = nothing, 1 = cardio only, 2 = workout, -1 = future day. */
export type HeatLevel = -1 | 0 | 1 | 2

/** Columns of 7 days (Mon–Sun), oldest week first, ending with this week. */
export function heatmap(logs: WorkoutLog[], numWeeks = 16): { date: string; level: HeatLevel }[][] {
  const levelByDate = new Map<string, HeatLevel>()
  for (const l of logs) {
    const level: HeatLevel = l.programId === "" ? 1 : 2
    if (level >= (levelByDate.get(l.date) ?? 0)) levelByDate.set(l.date, level)
  }
  const today = todayISO()
  const start = shiftDays(weekStartISO(), -7 * (numWeeks - 1))
  const weeks: { date: string; level: HeatLevel }[][] = []
  for (let w = 0; w < numWeeks; w++) {
    const col: { date: string; level: HeatLevel }[] = []
    for (let d = 0; d < 7; d++) {
      const date = shiftDays(start, w * 7 + d)
      col.push({ date, level: date > today ? -1 : (levelByDate.get(date) ?? 0) })
    }
    weeks.push(col)
  }
  return weeks
}

export interface PR {
  name: string
  kg: number
  prevKg: number
}

function topDoneWeight(sets: { done: boolean; weightKg: number }[]): number {
  return sets.reduce((m, s) => (s.done && s.weightKg > m ? s.weightKg : m), 0)
}

/**
 * New top-weight records in this session vs all previous logs. An exercise
 * with no history sets a baseline, not a PR.
 */
export function detectPRs(session: Session, logs: WorkoutLog[]): PR[] {
  const best = new Map<string, number>()
  for (const l of logs) {
    for (const e of l.exercises) {
      const top = topDoneWeight(e.sets)
      if (top > (best.get(e.name) ?? 0)) best.set(e.name, top)
    }
  }
  const prs: PR[] = []
  for (const e of session.exercises) {
    const top = topDoneWeight(e.sets)
    const prev = best.get(e.name)
    if (prev !== undefined && prev > 0 && top > prev) {
      prs.push({ name: e.name, kg: top, prevKg: prev })
    }
  }
  return prs
}

/** Total lifetime PR count, replaying logs oldest-first. */
export function totalPRCount(logs: WorkoutLog[]): number {
  const best = new Map<string, number>()
  let count = 0
  const ordered = [...logs].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  for (const l of ordered) {
    for (const e of l.exercises) {
      const top = topDoneWeight(e.sets)
      const prev = best.get(e.name)
      if (prev === undefined) {
        if (top > 0) best.set(e.name, top)
      } else if (top > prev) {
        best.set(e.name, top)
        if (prev > 0) count++
      }
    }
  }
  return count
}

export interface Totals {
  workouts: number
  cardioKm: number
  volumeKg: number
}

export function totals(logs: WorkoutLog[]): Totals {
  let workouts = 0
  let cardioKm = 0
  let volumeKg = 0
  for (const l of logs) {
    if (l.programId !== "") workouts++
    if (l.cardio?.done && l.cardio.distanceKm) cardioKm += l.cardio.distanceKm
    for (const e of l.exercises) {
      for (const s of e.sets) if (s.done) volumeKg += s.reps * s.weightKg
    }
  }
  return { workouts, cardioKm, volumeKg }
}

export type BadgeKind = "sessions" | "streak" | "pr" | "cardio" | "volume"

export interface Badge {
  id: string
  kind: BadgeKind
  label: string
  desc: string
  earned: boolean
}

export function badges(logs: WorkoutLog[], streakWeeks: number): Badge[] {
  const t = totals(logs)
  const prs = totalPRCount(logs)
  const list: Badge[] = []
  const add = (kind: BadgeKind, id: string, label: string, desc: string, earned: boolean) =>
    list.push({ id, kind, label, desc, earned })

  add("sessions", "s1", "First Session", "Log your first workout", t.workouts >= 1)
  add("sessions", "s10", "Regular", "10 workouts", t.workouts >= 10)
  add("sessions", "s25", "Committed", "25 workouts", t.workouts >= 25)
  add("sessions", "s50", "Machine", "50 workouts", t.workouts >= 50)
  add("sessions", "s100", "Century", "100 workouts", t.workouts >= 100)
  add("streak", "k2", "Back to Back", "2-week streak", streakWeeks >= 2)
  add("streak", "k4", "Habit Formed", "4-week streak", streakWeeks >= 4)
  add("streak", "k8", "Unstoppable", "8-week streak", streakWeeks >= 8)
  add("streak", "k12", "Iron Quarter", "12-week streak", streakWeeks >= 12)
  add("pr", "p1", "First PR", "Beat a previous top weight", prs >= 1)
  add("pr", "p10", "PR Hunter", "10 personal records", prs >= 10)
  add("pr", "p25", "Record Machine", "25 personal records", prs >= 25)
  add("cardio", "c10", "Out the Door", "10 km of cardio logged", t.cardioKm >= 10)
  add("cardio", "c50", "Roadwork", "50 km of cardio logged", t.cardioKm >= 50)
  add("volume", "v50k", "50 Tonnes", "50,000 kg total volume", t.volumeKg >= 50_000)
  add("volume", "v250k", "250 Tonnes", "250,000 kg total volume", t.volumeKg >= 250_000)
  return list
}
