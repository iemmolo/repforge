import type { Program, WorkoutLog } from "@/types"

export interface Suggestion {
  workoutId: string
  exerciseId: string
  exerciseName: string
  currentKg: number
  suggestedKg: number
}

/**
 * An exercise earns a weight bump when, in its most recent completed log for
 * this program, every set was done at (or above) the current target weight
 * for at least the target reps.
 */
export function suggestionsForProgram(program: Program, logs: WorkoutLog[]): Suggestion[] {
  const result: Suggestion[] = []
  const sorted = [...logs]
    .filter((l) => l.programId === program.id)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))

  for (const workout of program.workouts) {
    for (const exercise of workout.exercises) {
      if (exercise.incrementKg <= 0) continue
      const lastLog = sorted.find(
        (l) => l.workoutId === workout.id && l.exercises.some((e) => e.exerciseId === exercise.id),
      )
      if (!lastLog) continue
      const logged = lastLog.exercises.find((e) => e.exerciseId === exercise.id)!
      if (logged.sets.length < exercise.sets) continue
      const allHit = logged.sets.every(
        (s) => s.done && s.reps >= exercise.targetReps && s.weightKg >= exercise.weightKg,
      )
      if (allHit) {
        result.push({
          workoutId: workout.id,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          currentKg: exercise.weightKg,
          suggestedKg: exercise.weightKg + exercise.incrementKg,
        })
      }
    }
  }
  return result
}
