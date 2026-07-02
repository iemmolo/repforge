export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"

export interface Exercise {
  id: string
  name: string
  sets: number
  targetReps: number
  weightKg: number
  incrementKg: number
  restSeconds: number
  notes?: string
}

export type CardioType = "walk" | "run"

export interface CardioTarget {
  type: CardioType
  minutes: number
  distanceKm?: number
}

export interface CardioResult extends CardioTarget {
  done: boolean
}

export interface Workout {
  id: string
  name: string
  exercises: Exercise[]
  cardio?: CardioTarget
}

export type ProgramCategory = "strength" | "hypertrophy" | "classics" | "minimalist" | "recovery"

export interface Program {
  id: string
  name: string
  tagline: string
  category?: ProgramCategory // presets only; user programs get their own section
  favorite?: boolean
  /**
   * "weekly": workouts are pinned to weekdays via `schedule`.
   * "cycle": workouts run in array order on whatever days you train;
   * Today offers the one after your last logged session.
   */
  scheduleMode?: "weekly" | "cycle"
  daysPerWeek?: number // adherence target in cycle mode
  schedule: Partial<Record<DayOfWeek, string>> // day -> workoutId (weekly mode)
  workouts: Workout[]
}

export interface SetLog {
  done: boolean
  reps: number
  weightKg: number
}

export interface ExerciseLog {
  exerciseId: string
  name: string
  targetSets: number
  targetReps: number
  restSeconds: number
  notes?: string
  sets: SetLog[]
}

export interface Session {
  programId: string
  programName: string
  workoutId: string
  workoutName: string
  date: string // YYYY-MM-DD
  startedAt: string // ISO datetime
  exercises: ExerciseLog[]
  cardio?: CardioResult
}

export interface WorkoutLog extends Session {
  id: string
  completedAt: string
}

export interface AppState {
  version: 1
  programs: Program[]
  activeProgramId: string
  logs: WorkoutLog[]
  session: Session | null
}
