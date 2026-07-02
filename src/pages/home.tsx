import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowUpRight, ChevronRight, Footprints, Play, TrendingUp } from "lucide-react"
import { Stepper } from "@/components/stepper"
import { buildSession, nextCycleWorkout, useActiveProgram, useStore } from "@/lib/store"
import { suggestionsForProgram } from "@/lib/progression"
import {
  DAY_LABELS,
  WEEK_DAYS,
  completionPercent,
  dayOfWeek,
  fmtKg,
  logsThisWeek,
} from "@/lib/utils"
import type { CardioType, Workout } from "@/types"

export default function HomePage() {
  const { state, dispatch } = useStore()
  const program = useActiveProgram()
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)

  const today = dayOfWeek()
  const isCycle = program.scheduleMode === "cycle"
  const scheduled = isCycle
    ? nextCycleWorkout(program, state.logs)
    : program.workouts.find((w) => w.id === program.schedule[today])
  const others = program.workouts.filter((w) => w.id !== scheduled?.id)

  const suggestions = useMemo(
    () => suggestionsForProgram(program, state.logs),
    [program, state.logs],
  )

  const weekLogs = logsThisWeek(state.logs)
  // quick-logged cardio (programId "") doesn't count toward the program target
  const weekSessions = weekLogs.filter((l) => l.programId !== "")
  const weekCardio = weekLogs.length - weekSessions.length
  const weekTarget = isCycle
    ? (program.daysPerWeek ?? 3)
    : Object.keys(program.schedule).length || 3
  const trainedDays = new Set(weekSessions.map((l) => dayOfWeek(new Date(l.date + "T12:00:00"))))

  function start(workout: Workout) {
    dispatch({ type: "startSession", session: buildSession(program, workout) })
    navigate("/session")
  }

  function applyAllSuggestions() {
    dispatch({
      type: "applyWeights",
      programId: program.id,
      weights: suggestions.map((s) => ({
        workoutId: s.workoutId,
        exerciseId: s.exerciseId,
        kg: s.suggestedKg,
      })),
    })
  }

  return (
    <div className="space-y-5">
      {/* Active program banner */}
      <button
        type="button"
        className="animate-rise stagger-0 flex w-full items-center justify-between border border-line bg-surface px-4 py-3 text-left active:bg-raised"
        onClick={() => navigate("/programs")}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-dim">
            Active program
          </p>
          <p className="font-display text-lg text-volt">{program.name}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-faint" />
      </button>

      {/* Week adherence */}
      <div className="animate-rise stagger-1 border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-dim">This week</p>
          <p className="font-mono text-sm font-bold tabular">
            <span className={weekSessions.length >= weekTarget ? "text-volt" : ""}>
              {weekSessions.length}
            </span>
            <span className="text-faint">/{weekTarget}</span>
            {weekCardio > 0 && <span className="ml-1.5 text-volt-dim">+{weekCardio} cardio</span>}
          </p>
        </div>
        <div className="mt-3 flex gap-1.5">
          {WEEK_DAYS.map((d) => {
            const isToday = d === today
            const done = trainedDays.has(d)
            const planned = !isCycle && d in program.schedule
            return (
              <div key={d} className="flex-1 text-center">
                <div
                  className={`h-2 ${
                    done
                      ? "bg-volt"
                      : planned
                        ? "bg-line"
                        : "bg-raised"
                  }`}
                />
                <p
                  className={`mt-1 text-[10px] font-semibold uppercase ${
                    isToday ? "text-ink" : "text-faint"
                  }`}
                >
                  {DAY_LABELS[d]}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Resume or start */}
      {state.session ? (
        <button
          type="button"
          className="animate-rise stagger-2 w-full border-2 border-volt bg-surface p-5 text-left active:bg-raised"
          onClick={() => navigate("/session")}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-volt">
            Workout in progress — {completionPercent(state.session.exercises, state.session.cardio)}%
          </p>
          <p className="font-display mt-1 text-3xl">{state.session.workoutName}</p>
          <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-dim">
            Tap to resume <Play className="h-3.5 w-3.5" />
          </p>
        </button>
      ) : scheduled ? (
        <button
          type="button"
          className="animate-rise stagger-2 group relative w-full overflow-hidden bg-volt p-5 text-left text-carbon active:opacity-90"
          onClick={() => start(scheduled)}
        >
          <div className="absolute right-0 top-0 h-full w-3 hazard opacity-30" />
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
            {isCycle ? "Next up in rotation" : `Today · ${DAY_LABELS[today]}`}
          </p>
          <p className="font-display mt-1 text-3xl">{scheduled.name}</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide">
            <Play className="h-4 w-4 fill-current" /> Start workout
          </p>
        </button>
      ) : (
        <div className="animate-rise stagger-2 border border-line bg-surface p-5">
          <p className="font-display text-2xl text-dim">Rest day</p>
          <p className="mt-1 text-sm text-dim">Nothing scheduled — pick a workout below if you feel like it.</p>
        </div>
      )}

      {/* Progression suggestions */}
      {suggestions.length > 0 && !state.session && (
        <div className="animate-rise stagger-3 border border-volt-dim/60 bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-volt">
              <TrendingUp className="h-3.5 w-3.5" /> Time to move up
            </p>
            <button
              type="button"
              className="rounded bg-volt px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-carbon active:opacity-80"
              onClick={applyAllSuggestions}
            >
              Apply all
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {suggestions.map((s) => (
              <li
                key={`${s.workoutId}-${s.exerciseId}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-semibold">{s.exerciseName}</span>
                <span className="font-mono text-xs font-bold tabular text-dim">
                  {fmtKg(s.currentKg)}
                  <ArrowUpRight className="inline h-3.5 w-3.5 text-volt" />
                  <span className="text-volt">{fmtKg(s.suggestedKg)}kg</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick cardio log */}
      <CardioQuickLog />

      {/* Ad-hoc override */}
      {!state.session && others.length > 0 && (
        <div className="animate-rise stagger-4">
          <button
            type="button"
            className="text-[11px] font-semibold uppercase tracking-wider text-dim"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "▾" : "▸"} Or pick a different workout
          </button>
          {showAll && (
            <div className="mt-2 space-y-2">
              {others.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className="flex w-full items-center justify-between border border-line bg-surface px-4 py-3.5 text-left active:bg-raised"
                  onClick={() => start(w)}
                >
                  <div>
                    <p className="font-semibold">{w.name}</p>
                    <p className="text-xs text-dim">{w.exercises.length} exercises</p>
                  </div>
                  <Play className="h-4 w-4 text-volt" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CardioQuickLog() {
  const { dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const [ctype, setCtype] = useState<CardioType>("walk")
  const [minutes, setMinutes] = useState(30)
  const [km, setKm] = useState(0)
  const [saved, setSaved] = useState(false)

  function save() {
    dispatch({ type: "logCardio", cardioType: ctype, minutes, distanceKm: km || undefined })
    setOpen(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!open) {
    return (
      <button
        type="button"
        className="animate-rise stagger-3 flex w-full items-center justify-between border border-line bg-surface px-4 py-3.5 text-left active:bg-raised"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2 font-semibold">
          <Footprints className="h-4 w-4 text-volt" />
          {saved ? "Logged. Nice." : "Log a walk / run"}
        </span>
        <ChevronRight className="h-5 w-5 text-faint" />
      </button>
    )
  }

  return (
    <div className="animate-rise border border-line bg-surface p-4">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-dim">
        <Footprints className="h-3.5 w-3.5 text-volt" /> Log cardio
      </p>
      <div className="mt-3 flex gap-2">
        {(["walk", "run"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`h-11 flex-1 border text-sm font-bold uppercase tracking-wide ${
              ctype === t ? "border-volt bg-volt text-carbon" : "border-line text-dim active:bg-raised"
            }`}
            onClick={() => setCtype(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Stepper className="min-w-0 flex-1" value={minutes} step={5} min={5} suffix="min" onChange={setMinutes} />
        <Stepper className="min-w-0 flex-1" value={km} step={0.5} suffix="km" onChange={setKm} />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="h-12 flex-1 border border-line font-semibold uppercase tracking-wide text-dim active:bg-raised"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="h-12 flex-1 bg-volt font-semibold uppercase tracking-wide text-carbon active:opacity-80"
          onClick={save}
        >
          Save
        </button>
      </div>
    </div>
  )
}
