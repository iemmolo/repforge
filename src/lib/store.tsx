import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react"
import type { AppState, CardioType, Program, Session, Workout, WorkoutLog } from "@/types"
import { PRESET_PROGRAMS, seedState } from "@/lib/seed"
import { completionPercent, todayISO, uid } from "@/lib/utils"

const STORAGE_KEY = "repforge:v1"

type Action =
  | { type: "selectProgram"; programId: string }
  | { type: "saveProgram"; program: Program }
  | { type: "deleteProgram"; programId: string }
  | { type: "applyWeights"; programId: string; weights: { workoutId: string; exerciseId: string; kg: number }[] }
  | { type: "startSession"; session: Session }
  | { type: "updateSession"; session: Session }
  | { type: "discardSession" }
  | { type: "completeSession" }
  | { type: "toggleFavorite"; programId: string }
  | { type: "logCardio"; cardioType: CardioType; minutes: number; distanceKm?: number }
  | { type: "restoreProgram"; programId: string }
  | { type: "deleteLog"; logId: string }
  | { type: "importState"; state: AppState }
  | { type: "loadPresets" }
  | { type: "resetAll" }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "selectProgram":
      return { ...state, activeProgramId: action.programId }
    case "saveProgram": {
      const exists = state.programs.some((p) => p.id === action.program.id)
      const programs = exists
        ? state.programs.map((p) => (p.id === action.program.id ? action.program : p))
        : [...state.programs, action.program]
      return { ...state, programs }
    }
    case "deleteProgram": {
      const programs = state.programs.filter((p) => p.id !== action.programId)
      if (programs.length === 0) return state
      const activeProgramId =
        state.activeProgramId === action.programId ? programs[0].id : state.activeProgramId
      return { ...state, programs, activeProgramId }
    }
    case "applyWeights": {
      const programs = state.programs.map((p) => {
        if (p.id !== action.programId) return p
        return {
          ...p,
          workouts: p.workouts.map((w) => ({
            ...w,
            exercises: w.exercises.map((e) => {
              const hit = action.weights.find(
                (s) => s.workoutId === w.id && s.exerciseId === e.id,
              )
              return hit ? { ...e, weightKg: hit.kg } : e
            }),
          })),
        }
      })
      return { ...state, programs }
    }
    case "startSession":
      return { ...state, session: action.session }
    case "updateSession":
      return { ...state, session: action.session }
    case "discardSession":
      return { ...state, session: null }
    case "completeSession": {
      if (!state.session) return state
      const log: WorkoutLog = {
        ...state.session,
        id: uid(),
        completedAt: new Date().toISOString(),
      }
      return { ...state, session: null, logs: [log, ...state.logs] }
    }
    case "toggleFavorite":
      return {
        ...state,
        programs: state.programs.map((p) =>
          p.id === action.programId ? { ...p, favorite: !p.favorite } : p,
        ),
      }
    case "logCardio": {
      // quick-logged cardio: programId "" keeps it out of weekly adherence
      const now = new Date()
      const log: WorkoutLog = {
        id: uid(),
        programId: "",
        programName: "Cardio",
        workoutId: "",
        workoutName: action.cardioType === "walk" ? "Walk" : "Run",
        date: todayISO(),
        startedAt: now.toISOString(),
        completedAt: now.toISOString(),
        exercises: [],
        cardio: {
          type: action.cardioType,
          minutes: action.minutes,
          distanceKm: action.distanceKm,
          done: true,
        },
      }
      return { ...state, logs: [log, ...state.logs] }
    }
    case "restoreProgram": {
      const preset = PRESET_PROGRAMS.find((p) => p.id === action.programId)
      if (!preset) return state
      return {
        ...state,
        programs: state.programs.map((p) =>
          p.id === action.programId ? structuredClone(preset) : p,
        ),
      }
    }
    case "deleteLog":
      return { ...state, logs: state.logs.filter((l) => l.id !== action.logId) }
    case "importState":
      return action.state
    case "loadPresets": {
      // add any preset program not already present; never overwrite edits
      const missing = PRESET_PROGRAMS.filter(
        (preset) => !state.programs.some((p) => p.id === preset.id),
      )
      if (missing.length === 0) return state
      return { ...state, programs: [...state.programs, ...missing] }
    }
    case "resetAll":
      return seedState()
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed.version === 1 && Array.isArray(parsed.programs)) return parsed
    }
  } catch {
    // corrupted storage falls through to seed
  }
  return seedState()
}

interface StoreContextValue {
  state: AppState
  dispatch: (action: Action) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}

export function useActiveProgram(): Program {
  const { state } = useStore()
  return (
    state.programs.find((p) => p.id === state.activeProgramId) ?? state.programs[0]
  )
}

/** Build a fresh session with reps pre-filled to targets — log by exception. */
export function buildSession(program: Program, workout: Workout): Session {
  return {
    programId: program.id,
    programName: program.name,
    workoutId: workout.id,
    workoutName: workout.name,
    date: todayISO(),
    startedAt: new Date().toISOString(),
    exercises: workout.exercises.map((e) => ({
      exerciseId: e.id,
      name: e.name,
      targetSets: e.sets,
      targetReps: e.targetReps,
      restSeconds: e.restSeconds,
      notes: e.notes,
      sets: Array.from({ length: e.sets }, () => ({
        done: false,
        reps: e.targetReps,
        weightKg: e.weightKg,
      })),
    })),
    cardio: workout.cardio ? { ...workout.cardio, done: false } : undefined,
  }
}

/**
 * Cycle-mode programs: the workout after the last one logged for this
 * program, in workout-array order. Ad-hoc picks simply move the pointer.
 */
export function nextCycleWorkout(program: Program, logs: WorkoutLog[]): Workout | undefined {
  const order = program.workouts
  if (order.length === 0) return undefined
  const last = [...logs]
    .filter((l) => l.programId === program.id)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
  if (!last) return order[0]
  const idx = order.findIndex((w) => w.id === last.workoutId)
  return order[(idx + 1) % order.length]
}

export { completionPercent }
