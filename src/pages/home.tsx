import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck,
  Check,
  ChevronRight,
  Download,
  Flame,
  Footprints,
  Play,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"
import { weeklyStreak } from "@/lib/gamify"
import { Stepper } from "@/components/stepper"
import { Confirm } from "@/components/confirm"
import { buildSession, nextCycleWorkout, useActiveProgram, useStore } from "@/lib/store"
import { suggestionKey, suggestionsForProgram, type Suggestion } from "@/lib/progression"
import {
  DAY_LABELS,
  WEEK_DAYS,
  completionPercent,
  dayOfWeek,
  downloadBackup,
  fmtKg,
  logsThisWeek,
  todayISO,
} from "@/lib/utils"
import type { CardioType, Workout } from "@/types"

export default function HomePage() {
  const { state, dispatch } = useStore()
  const program = useActiveProgram()
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)
  const [pendingClass, setPendingClass] = useState<Workout | null>(null)

  const today = dayOfWeek()
  const isCycle = program.scheduleMode === "cycle"
  const scheduled = isCycle
    ? nextCycleWorkout(program, state.logs)
    : program.workouts.find((w) => w.id === program.schedule[today])
  const others = program.workouts.filter((w) => w.id !== scheduled?.id)

  const suggestions = useMemo(() => {
    const dismissed = new Set(state.dismissedSuggestions ?? [])
    return suggestionsForProgram(program, state.logs).filter(
      (s) => !dismissed.has(suggestionKey(program.id, s)),
    )
  }, [program, state.logs, state.dismissedSuggestions])
  const ups = suggestions.filter((s) => s.kind === "up")
  const deloads = suggestions.filter((s) => s.kind === "deload")

  const weekLogs = logsThisWeek(state.logs)
  // quick-logged cardio/classes (programId "") don't count toward the program target
  const weekSessions = weekLogs.filter((l) => l.programId !== "")
  const weekExtras = weekLogs.length - weekSessions.length
  const weekTarget = isCycle
    ? (program.daysPerWeek ?? 3)
    : Object.keys(program.schedule).length || 3
  const streak = weeklyStreak(state.logs, weekTarget)
  const trainedDays = new Set(weekSessions.map((l) => dayOfWeek(new Date(l.date + "T12:00:00"))))

  function start(workout: Workout) {
    if (workout.kind === "class") {
      setPendingClass(workout)
      return
    }
    dispatch({ type: "startSession", session: buildSession(program, workout) })
    navigate("/session")
  }

  function logClass(workout: Workout, minutes: number) {
    dispatch({
      type: "logClass",
      programId: program.id,
      programName: program.name,
      workoutId: workout.id,
      workoutName: workout.name,
      minutes,
    })
  }

  function apply(items: Suggestion[]) {
    dispatch({
      type: "applyWeights",
      programId: program.id,
      weights: items.map((s) => ({
        workoutId: s.workoutId,
        exerciseId: s.exerciseId,
        kg: s.suggestedKg,
      })),
    })
  }

  function dismiss(items: Suggestion[]) {
    dispatch({
      type: "dismissSuggestions",
      keys: items.map((s) => suggestionKey(program.id, s)),
    })
  }

  return (
    <div className="space-y-5">
      <BackupNudge />

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
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-dim">
            This week
            {streak.weeks > 0 && (
              <span className="flex items-center gap-0.5 font-mono text-xs font-bold normal-case tracking-normal text-volt">
                <Flame className="h-3.5 w-3.5" fill="currentColor" />
                {streak.weeks} wk
              </span>
            )}
          </p>
          <p className="font-mono text-sm font-bold tabular">
            <span className={weekSessions.length >= weekTarget ? "text-volt" : ""}>
              {weekSessions.length}
            </span>
            <span className="text-faint">/{weekTarget}</span>
            {weekExtras > 0 && <span className="ml-1.5 text-volt-dim">+{weekExtras} extra</span>}
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

      {/* Resume, start, class, or rest */}
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
      ) : scheduled?.kind === "class" ? (
        <ClassCard
          key={scheduled.id}
          workout={scheduled}
          headline={isCycle ? "Next up in rotation" : `Today · ${DAY_LABELS[today]}`}
          doneToday={state.logs.some((l) => l.date === todayISO() && l.workoutId === scheduled.id)}
          onDone={(minutes) => logClass(scheduled, minutes)}
        />
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
      {ups.length > 0 && !state.session && (
        <SuggestionCard kind="up" items={ups} onApply={apply} onDismiss={dismiss} />
      )}
      {deloads.length > 0 && !state.session && (
        <SuggestionCard kind="deload" items={deloads} onApply={apply} onDismiss={dismiss} />
      )}

      {/* Quick cardio / class log */}
      <ActivityQuickLog />

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
                    <p className="text-xs text-dim">
                      {w.kind === "class"
                        ? `class · ${w.classMinutes ?? 60} min`
                        : `${w.exercises.length} exercises`}
                    </p>
                  </div>
                  {w.kind === "class" ? (
                    <CalendarCheck className="h-4 w-4 text-volt" />
                  ) : (
                    <Play className="h-4 w-4 text-volt" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Confirm
        open={pendingClass !== null}
        title={`Log ${pendingClass?.name}?`}
        body={`Marks it done for today (${pendingClass?.classMinutes ?? 60} min) and counts toward this week.`}
        confirmLabel="Log it"
        tone="accent"
        onConfirm={() => pendingClass && logClass(pendingClass, pendingClass.classMinutes ?? 60)}
        onClose={() => setPendingClass(null)}
      />
    </div>
  )
}

/** Scheduled class (BJJ, pilates…): no session to run — adjust minutes, one tap done. */
function ClassCard({
  workout,
  headline,
  doneToday,
  onDone,
}: {
  workout: Workout
  headline: string
  doneToday: boolean
  onDone: (minutes: number) => void
}) {
  const [minutes, setMinutes] = useState(workout.classMinutes ?? 60)

  if (doneToday) {
    return (
      <div className="animate-rise stagger-2 border-2 border-volt-dim/60 bg-surface p-5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-volt">
          <Check className="h-3.5 w-3.5" strokeWidth={3} /> Done today
        </p>
        <p className="font-display mt-1 text-3xl text-dim">{workout.name}</p>
      </div>
    )
  }

  return (
    <div className="animate-rise stagger-2 relative overflow-hidden bg-volt p-5 text-carbon">
      <div className="absolute right-0 top-0 h-full w-3 hazard opacity-30" />
      <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
        {headline} · Class
      </p>
      <p className="font-display mt-1 text-3xl">{workout.name}</p>
      <div className="mt-3 flex items-center gap-2">
        <Stepper className="w-32 shrink-0 text-ink" value={minutes} step={15} min={15} suffix="min" onChange={setMinutes} />
        <button
          type="button"
          className="flex h-11 flex-1 items-center justify-center gap-1.5 bg-carbon font-display text-base text-volt active:opacity-80"
          onClick={() => onDone(minutes)}
        >
          <Check className="h-4 w-4" strokeWidth={3} /> Mark done
        </button>
      </div>
    </div>
  )
}

function SuggestionCard({
  kind,
  items,
  onApply,
  onDismiss,
}: {
  kind: "up" | "deload"
  items: Suggestion[]
  onApply: (items: Suggestion[]) => void
  onDismiss: (items: Suggestion[]) => void
}) {
  const up = kind === "up"
  return (
    <div
      className={`animate-rise stagger-3 border bg-surface p-4 ${
        up ? "border-volt-dim/60" : "border-danger/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <p
          className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${
            up ? "text-volt" : "text-danger"
          }`}
        >
          {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {up ? "Time to move up" : "Consider a deload"}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={`rounded px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide active:opacity-80 ${
              up ? "bg-volt text-carbon" : "border border-danger/60 text-danger"
            }`}
            onClick={() => onApply(items)}
          >
            Apply all
          </button>
          <button
            type="button"
            className="rounded border border-line px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-dim active:bg-raised"
            onClick={() => onDismiss(items)}
          >
            Dismiss
          </button>
        </div>
      </div>
      {!up && (
        <p className="mt-1 text-xs text-dim">
          Three sessions running below target — dropping back builds momentum.
        </p>
      )}
      <ul className="mt-2 space-y-1">
        {items.map((s) => (
          <li
            key={`${s.workoutId}-${s.exerciseId}`}
            className="flex items-center justify-between text-sm"
          >
            <span className="font-semibold">{s.exerciseName}</span>
            <span className="font-mono text-xs font-bold tabular text-dim">
              {fmtKg(s.currentKg)}
              {up ? (
                <ArrowUpRight className="inline h-3.5 w-3.5 text-volt" />
              ) : (
                <ArrowDownRight className="inline h-3.5 w-3.5 text-danger" />
              )}
              <span className={up ? "text-volt" : "text-danger"}>{fmtKg(s.suggestedKg)}kg</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Nag (gently) once there's real data at risk and no recent backup. */
function BackupNudge() {
  const { state, dispatch } = useStore()

  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
  const stale =
    !state.lastExportAt || Date.now() - Date.parse(state.lastExportAt) > THIRTY_DAYS
  const snoozed = state.backupSnoozedUntil !== undefined && todayISO() < state.backupSnoozedUntil
  if (state.logs.length < 10 || !stale || snoozed) return null

  function snooze() {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    dispatch({ type: "snoozeBackupNudge", untilISO: iso })
  }

  return (
    <div className="animate-rise flex items-center gap-3 border border-line bg-surface px-4 py-3">
      <Download className="h-4 w-4 shrink-0 text-volt" />
      <p className="min-w-0 flex-1 text-xs text-dim">
        {state.logs.length} logs live only in this browser. Back them up.
      </p>
      <button
        type="button"
        className="shrink-0 rounded bg-volt px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-carbon active:opacity-80"
        onClick={() => {
          downloadBackup(state)
          dispatch({ type: "markExported" })
        }}
      >
        Export
      </button>
      <button
        type="button"
        className="-m-1 shrink-0 p-1 text-faint active:text-ink"
        onClick={snooze}
        aria-label="snooze backup reminder"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function ActivityQuickLog() {
  const { dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const [ctype, setCtype] = useState<CardioType | "class">("walk")
  const [className, setClassName] = useState("")
  const [minutes, setMinutes] = useState(30)
  const [km, setKm] = useState(0)
  const [saved, setSaved] = useState(false)

  function save() {
    if (ctype === "class") {
      dispatch({
        type: "logClass",
        programId: "",
        programName: "Class",
        workoutId: "",
        workoutName: className.trim() || "Class",
        minutes,
      })
    } else {
      dispatch({ type: "logCardio", cardioType: ctype, minutes, distanceKm: km || undefined })
    }
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
          {saved ? "Logged. Nice." : "Log a walk / run / class"}
        </span>
        <ChevronRight className="h-5 w-5 text-faint" />
      </button>
    )
  }

  return (
    <div className="animate-rise border border-line bg-surface p-4">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-dim">
        <Footprints className="h-3.5 w-3.5 text-volt" /> Log activity
      </p>
      <div className="mt-3 flex gap-2">
        {(["walk", "run", "class"] as const).map((t) => (
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
      {ctype === "class" && (
        <input
          className="mt-2 h-11 w-full border border-line bg-raised px-3 text-sm font-semibold outline-none placeholder:text-faint focus:border-volt"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          placeholder="Class name (BJJ, pilates, spin…)"
        />
      )}
      <div className="mt-2 flex gap-2">
        <Stepper className="min-w-0 flex-1" value={minutes} step={5} min={5} suffix="min" onChange={setMinutes} />
        {ctype !== "class" && (
          <Stepper className="min-w-0 flex-1" value={km} step={0.5} suffix="km" onChange={setKm} />
        )}
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
