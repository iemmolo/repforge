import type { Program, WorkoutLog } from "@/types"

export interface Suggestion {
  kind: "up" | "deload"
  workoutId: string
  exerciseId: string
  exerciseName: string
  currentKg: number
  suggestedKg: number
}

/** consecutive missed sessions at the current weight before a deload is suggested */
const DELOAD_AFTER_MISSES = 3

/**
 * At/below this target-rep count a lift is treated as linear strength work
 * (5×5, GZCLP T1, heavy singles) — it's meant to climb every clean session.
 * Above it, the lift is rep-range/accessory work, where a bump after a single
 * good session is just noise, so we wait for two clean sessions in a row.
 */
const LINEAR_REP_CEILING = 5
const CLEAN_SESSIONS_LINEAR = 1
const CLEAN_SESSIONS_REP_RANGE = 2

/** Stable identity for a suggestion — changes when the weights involved change. */
export function suggestionKey(programId: string, s: Suggestion): string {
  return `${programId}:${s.workoutId}:${s.exerciseId}:${s.suggestedKg}`
}

/**
 * "up": the last clean session(s) hit every set at (or above) the current
 * target weight for at least the target reps. Low-rep strength lifts fire
 * after one such session; higher-rep work waits for two in a row so
 * accessories don't nag a bump every single time you meet the number.
 * "deload": the last DELOAD_AFTER_MISSES logs that attempted the current
 * target weight all missed it — suggest ~90%, rounded to the increment.
 */
export function suggestionsForProgram(program: Program, logs: WorkoutLog[]): Suggestion[] {
  const result: Suggestion[] = []
  const sorted = [...logs]
    .filter((l) => l.programId === program.id)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))

  for (const workout of program.workouts) {
    for (const exercise of workout.exercises) {
      if (exercise.incrementKg <= 0) continue

      const hitTarget = (l: WorkoutLog) =>
        l.exercises
          .find((e) => e.exerciseId === exercise.id)!
          .sets.every((s) => s.done && s.reps >= exercise.targetReps && s.weightKg >= exercise.weightKg)

      // logs that attempted this exercise at the current target weight —
      // sets prefill at the target, so pre-increase logs drop out here
      const attempts = sorted.filter((l) => {
        if (l.workoutId !== workout.id) return false
        const e = l.exercises.find((e) => e.exerciseId === exercise.id)
        return (
          e !== undefined &&
          e.sets.length >= exercise.sets &&
          e.sets.some((s) => s.weightKg >= exercise.weightKg)
        )
      })
      if (attempts.length === 0) continue

      const needed =
        exercise.targetReps <= LINEAR_REP_CEILING
          ? CLEAN_SESSIONS_LINEAR
          : CLEAN_SESSIONS_REP_RANGE
      if (attempts.length >= needed && attempts.slice(0, needed).every(hitTarget)) {
        result.push({
          kind: "up",
          workoutId: workout.id,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          currentKg: exercise.weightKg,
          suggestedKg: exercise.weightKg + exercise.incrementKg,
        })
        continue
      }

      if (exercise.weightKg <= 0 || attempts.length < DELOAD_AFTER_MISSES) continue
      const recent = attempts.slice(0, DELOAD_AFTER_MISSES)
      if (recent.some(hitTarget)) continue

      const step = exercise.incrementKg
      let deloadKg = Math.round((exercise.weightKg * 0.9) / step) * step
      deloadKg = Math.round(deloadKg * 100) / 100
      if (deloadKg >= exercise.weightKg) deloadKg = exercise.weightKg - step
      if (deloadKg <= 0) continue
      result.push({
        kind: "deload",
        workoutId: workout.id,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        currentKg: exercise.weightKg,
        suggestedKg: deloadKg,
      })
    }
  }
  return result
}
