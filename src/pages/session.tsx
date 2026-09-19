import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowDownToLine,
  Check,
  CheckCircle2,
  ChevronDown,
  CornerDownLeft,
  Footprints,
  Pencil,
  Play,
  Plus,
  Square,
  X,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { Stepper } from "@/components/stepper"
import { Confirm } from "@/components/confirm"
import { Celebration } from "@/components/celebration"
import { RestTimerBar, type RestTimer } from "@/components/rest-timer"
import { primeAudio } from "@/lib/audio"
import { detectPRs, type PR } from "@/lib/gamify"
import {
  BAR_KG,
  CARDIO_LABELS,
  completionPercent,
  fmtClock,
  fmtDate,
  fmtKg,
  plannedWeights,
  platesPerSide,
  sameWeights,
  supersetBlocks,
  uid,
  weightPatch,
} from "@/lib/utils"
import type { Exercise, ExerciseLog, Program, Session, WorkoutLog } from "@/types"

/**
 * Last n outings for this exercise, newest first. Matched by id first so a
 * rename doesn't lose the trail, falling back to the name for older logs.
 */
function recentHistory(logs: WorkoutLog[], exercise: ExerciseLog, n = 3) {
  const out: { date: string; reps: number[]; weights: number[]; topKg: number }[] = []
  for (const l of logs) {
    const e =
      l.exercises.find((e) => e.exerciseId === exercise.exerciseId) ??
      l.exercises.find((e) => e.name === exercise.name)
    if (!e) continue
    const done = e.sets.filter((s) => s.done)
    if (done.length === 0) continue
    out.push({
      date: l.date,
      reps: done.map((s) => s.reps),
      weights: done.map((s) => s.weightKg),
      topKg: Math.max(...done.map((s) => s.weightKg)),
    })
    if (out.length === n) break
  }
  return out
}

/** "12.5" when every set matches, "10/12.5/12.5" when it's a ramp. */
function fmtWeights(weights: number[]): string {
  return weights.every((w) => w === weights[0])
    ? fmtKg(weights[0] ?? 0)
    : weights.map(fmtKg).join("/")
}

/** A hold in progress: which set is being timed and when it started. */
interface Hold {
  exIdx: number
  setIdx: number
  startedAt: number
}

export default function SessionPage() {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const [timer, setTimer] = useState<RestTimer | null>(null)
  const [openInfo, setOpenInfo] = useState<number | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [celebration, setCelebration] = useState<{ workoutName: string; prs: PR[] } | null>(null)
  // exerciseId -> explicit collapse override; falls back to "collapsed when all done"
  const [collapse, setCollapse] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<number | null>(null)
  const [nameDraft, setNameDraft] = useState("")
  const [hold, setHold] = useState<Hold | null>(null)
  const [holdNow, setHoldNow] = useState(0)
  const [addingExercise, setAddingExercise] = useState(false)
  // exerciseId -> the weight column already written to the program, so the
  // button can confirm "Saved" instead of silently vanishing
  const [savedWeights, setSavedWeights] = useState<Record<string, string>>({})
  // one prompt: "you changed this session — keep it in the program too?"
  const [persist, setPersist] = useState<{ body: string; run: () => void } | null>(null)

  // tick the live hold clock while a set is being timed
  useEffect(() => {
    if (!hold) return
    const id = setInterval(() => setHoldNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [hold])

  const session = state.session
  if (!session) {
    // finished or discarded — nothing to render here
    return null
  }

  const pct = completionPercent(session.exercises, session.cardio)
  const program = state.programs.find((p) => p.id === session.programId)
  const blocks = supersetBlocks(session.exercises)

  function update(session: Session) {
    dispatch({ type: "updateSession", session })
  }

  function patchSet(exIdx: number, setIdx: number, patch: Partial<ExerciseLog["sets"][number]>) {
    if (!session) return
    const exercises = session.exercises.map((e, i) =>
      i !== exIdx
        ? e
        : { ...e, sets: e.sets.map((s, j) => (j !== setIdx ? s : { ...s, ...patch })) },
    )
    update({ ...session, exercises })
  }

  function toggleSet(exIdx: number, setIdx: number) {
    if (!session) return
    const exercise = session.exercises[exIdx]
    const set = exercise.sets[setIdx]
    const done = !set.done
    patchSet(exIdx, setIdx, { done })
    if (done && exercise.restSeconds > 0) {
      startRest(exercise.name, exercise.restSeconds)
    } else if (!done) {
      // unticking cancels the rest you started for this exercise
      setTimer((t) => (t && t.label === exercise.name ? null : t))
    }
  }

  /** Superset rounds get one tick: marks that set of every exercise in the group. */
  function toggleRound(block: number[], round: number) {
    if (!session) return
    const done = !block.every((i) => session.exercises[i].sets[round]?.done ?? true)
    update({
      ...session,
      exercises: session.exercises.map((e, i) =>
        !block.includes(i)
          ? e
          : { ...e, sets: e.sets.map((s, j) => (j === round ? { ...s, done } : s)) },
      ),
    })
    const label = `Superset round ${round + 1}`
    const rest = Math.max(...block.map((i) => session.exercises[i].restSeconds))
    if (done && rest > 0) startRest(label, rest)
    else if (!done) setTimer((t) => (t && t.label === label ? null : t))
  }

  function startRest(label: string, seconds: number) {
    // always reached from a tap — the only moment iOS will let us wake audio
    // for the chime that fires from a timer `seconds` from now
    primeAudio()
    setTimer({ endsAt: Date.now() + seconds * 1000, totalSeconds: seconds, label })
  }

  // ——— timed holds (planks etc.)
  function startHold(exIdx: number, setIdx: number) {
    setHoldNow(Date.now())
    setHold({ exIdx, setIdx, startedAt: Date.now() })
  }

  function stopHold() {
    if (!session || !hold) return
    const seconds = Math.max(1, Math.round((Date.now() - hold.startedAt) / 1000))
    const exercise = session.exercises[hold.exIdx]
    patchSet(hold.exIdx, hold.setIdx, { reps: seconds, done: true })
    setHold(null)
    if (exercise.restSeconds > 0) startRest(exercise.name, exercise.restSeconds)
  }

  // ——— on-the-fly edits: apply to the session, then offer to persist to the program
  function askPersist(body: string, run: () => void) {
    if (!program) return // ad-hoc session with no live program — session-only edit
    setPersist({ body, run })
  }

  function patchTemplate(exerciseId: string, patch: Partial<Exercise>) {
    patchTemplates({ [exerciseId]: patch })
  }

  /** Several exercises in one save — separate saves would each start from the stale program. */
  function patchTemplates(patches: Record<string, Partial<Exercise>>) {
    if (!program || !session) return
    const next: Program = {
      ...program,
      workouts: program.workouts.map((w) =>
        w.id !== session.workoutId
          ? w
          : { ...w, exercises: w.exercises.map((e) => (patches[e.id] ? { ...e, ...patches[e.id] } : e)) },
      ),
    }
    dispatch({ type: "saveProgram", program: next })
  }

  function addTemplateExercise(exercise: Exercise) {
    if (!program || !session) return
    const next: Program = {
      ...program,
      workouts: program.workouts.map((w) =>
        w.id !== session.workoutId ? w : { ...w, exercises: [...w.exercises, exercise] },
      ),
    }
    dispatch({ type: "saveProgram", program: next })
  }

  function commitRename(exIdx: number) {
    if (!session) return
    const exercise = session.exercises[exIdx]
    const name = nameDraft.trim()
    setEditing(null)
    if (!name || name === exercise.name) return
    const from = exercise.name
    update({ ...session, exercises: session.exercises.map((e, i) => (i === exIdx ? { ...e, name } : e)) })
    askPersist(`Rename “${from}” to “${name}” in ${program?.name} for next time?`, () =>
      patchTemplate(exercise.exerciseId, { name }),
    )
  }

  /** Write today's weights straight into the program so next time prefills them. */
  function saveWeights(exIdx: number) {
    if (!session) return
    const exercise = session.exercises[exIdx]
    const weights = exercise.sets.map((s) => s.weightKg)
    patchTemplate(exercise.exerciseId, weightPatch(weights))
    setSavedWeights((m) => ({ ...m, [exercise.exerciseId]: weights.join(",") }))
  }

  /** Reuse a past session's weights — tapped from a row in the history panel. */
  function applyWeightsToSets(exIdx: number, weights: number[]) {
    if (!session) return
    update({
      ...session,
      exercises: session.exercises.map((e, i) =>
        i !== exIdx
          ? e
          : { ...e, sets: e.sets.map((s, j) => ({ ...s, weightKg: weights[j] ?? s.weightKg })) },
      ),
    })
  }

  function addSet(exIdx: number) {
    if (!session) return
    const exercise = session.exercises[exIdx]
    const last = exercise.sets[exercise.sets.length - 1]
    const fresh = { done: false, reps: last?.reps ?? exercise.targetReps, weightKg: last?.weightKg ?? 0 }
    const count = exercise.sets.length + 1
    update({
      ...session,
      exercises: session.exercises.map((e, i) =>
        i === exIdx ? { ...e, targetSets: count, sets: [...e.sets, fresh] } : e,
      ),
    })
    askPersist(`Make ${exercise.name} ${count} sets in the program for next time?`, () =>
      patchTemplate(exercise.exerciseId, { sets: count }),
    )
  }

  /** One more set of every exercise in a superset. */
  function addRound(block: number[]) {
    if (!session) return
    const count = Math.max(...block.map((i) => session.exercises[i].sets.length)) + 1
    update({
      ...session,
      exercises: session.exercises.map((e, i) => {
        if (!block.includes(i)) return e
        const last = e.sets[e.sets.length - 1]
        const fresh = Array.from({ length: count - e.sets.length }, () => ({
          done: false,
          reps: last?.reps ?? e.targetReps,
          weightKg: last?.weightKg ?? 0,
        }))
        return { ...e, targetSets: count, sets: [...e.sets, ...fresh] }
      }),
    })
    askPersist(`Make this superset ${count} rounds in ${program?.name} for next time?`, () =>
      patchTemplates(
        Object.fromEntries(block.map((i) => [session.exercises[i].exerciseId, { sets: count }])),
      ),
    )
  }

  function addExercise(fields: NewExercise) {
    if (!session) return
    const template: Exercise = {
      id: uid(),
      name: fields.name,
      sets: fields.sets,
      targetReps: fields.targetReps,
      weightKg: fields.weightKg,
      incrementKg: 2.5,
      restSeconds: fields.restSeconds,
      mode: fields.mode === "time" ? "time" : undefined,
    }
    const log: ExerciseLog = {
      exerciseId: template.id,
      name: template.name,
      targetSets: template.sets,
      targetReps: template.targetReps,
      restSeconds: template.restSeconds,
      mode: template.mode,
      sets: Array.from({ length: template.sets }, () => ({
        done: false,
        reps: template.targetReps,
        weightKg: template.weightKg,
      })),
    }
    update({ ...session, exercises: [...session.exercises, log] })
    setAddingExercise(false)
    askPersist(`Add ${template.name} to ${program?.name} for next time?`, () =>
      addTemplateExercise(template),
    )
  }

  // the session is logged when the celebration is dismissed, so the
  // finished workout stays visible behind the overlay
  function finish() {
    if (!session) return
    setTimer(null)
    setCelebration({ workoutName: session.workoutName, prs: detectPRs(session, state.logs) })
  }

  function dismissCelebration() {
    dispatch({ type: "completeSession" })
    navigate("/", { replace: true })
  }

  function discard() {
    dispatch({ type: "discardSession" })
    navigate("/", { replace: true })
  }

  /**
   * A superset card, laid out round by round: one set of each exercise,
   * then the rest timer. Rename, history and weight-saving stay on single
   * exercise cards.
   */
  function renderSuperset(block: number[]) {
    if (!session) return null
    const members = block.map((i) => session.exercises[i])
    const key = `superset:${members[0].exerciseId}`
    const rounds = Math.max(...members.map((e) => e.sets.length))
    const roundDone = (r: number) => members.every((e) => e.sets[r]?.done ?? true)
    const allDone = Array.from({ length: rounds }, (_, r) => r).every(roundDone)
    const roundsDone = Array.from({ length: rounds }, (_, r) => r).filter(roundDone).length
    const isCollapsed = collapse[key] ?? allDone
    const toggleCollapse = () => setCollapse((c) => ({ ...c, [key]: !isCollapsed }))

    return (
      <section
        key={key}
        className={`animate-rise border bg-surface ${allDone ? "border-volt-dim/50" : "border-line"}`}
        style={{ animationDelay: `${block[0] * 50}ms` }}
      >
        <button
          type="button"
          className="flex w-full items-center gap-2 border-b border-line px-4 py-3 text-left"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "expand superset" : "collapse superset"}
        >
          <div className="min-w-0 flex-1">
            <h2 className={`font-display text-lg ${allDone ? "text-volt" : ""}`}>Superset</h2>
            <p className="text-xs text-dim">
              {isCollapsed
                ? `${roundsDone}/${rounds} rounds done`
                : members.map((e) => e.name).join(" · ")}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs font-bold tabular text-dim">
            {rounds} rounds
            <ChevronDown
              className={`h-3.5 w-3.5 text-faint transition-transform ${isCollapsed ? "" : "rotate-180"}`}
            />
          </span>
        </button>

        {!isCollapsed && (
          <>
            {Array.from({ length: rounds }, (_, r) => (
              <div key={r} className="border-b border-line/60">
                <div className="flex items-center justify-between py-2 pr-2.5 pl-4">
                  <p
                    className={`font-mono text-xs font-bold uppercase ${
                      roundDone(r) ? "text-volt" : "text-faint"
                    }`}
                  >
                    Round {r + 1}
                  </p>
                  <button
                    type="button"
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      roundDone(r)
                        ? "animate-punch bg-volt text-carbon"
                        : "border border-line text-faint active:bg-raised"
                    }`}
                    onClick={() => toggleRound(block, r)}
                    aria-label={`round ${r + 1} ${roundDone(r) ? "done" : "not done"}`}
                  >
                    <Check className="h-5 w-5" strokeWidth={3} />
                  </button>
                </div>
                <div className="divide-y divide-line/60">
                  {block.map((exIdx) => {
                    const exercise = session.exercises[exIdx]
                    const set = exercise.sets[r]
                    if (!set) return null
                    const timed = exercise.mode === "time"
                    return (
                      <div key={exIdx} className="px-2.5 py-2">
                        <p className="truncate px-0.5 pb-1 text-xs font-semibold">
                          {exercise.name}
                          {r === 0 && exercise.notes && (
                            <span className="font-normal text-dim"> · {exercise.notes}</span>
                          )}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Stepper
                            className="min-w-0 flex-1"
                            value={set.reps}
                            step={timed ? 5 : 1}
                            suffix={timed ? "s" : undefined}
                            onChange={(reps) => patchSet(exIdx, r, { reps })}
                          />
                          {!timed && (
                            <Stepper
                              className="min-w-0 flex-[1.2]"
                              value={set.weightKg}
                              step={2.5}
                              suffix="kg"
                              onChange={(weightKg) => patchSet(exIdx, r, { weightKg })}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1 py-2 text-xs font-semibold uppercase tracking-wide text-dim active:bg-raised"
              onClick={() => addRound(block)}
            >
              <Plus className="h-3.5 w-3.5" /> Add round
            </button>
          </>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-dim">
            {session.programName}
          </p>
          <h1 className="font-display text-3xl">{session.workoutName}</h1>
        </div>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-dim active:bg-raised"
          onClick={() => setConfirmDiscard(true)}
          aria-label="discard workout"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 bg-raised">
          <div className="h-full bg-volt transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <span className="font-mono text-sm font-bold tabular text-dim">{pct}%</span>
      </div>

      {blocks.map((block) => {
        if (block.length > 1) return renderSuperset(block)
        const exIdx = block[0]
        const exercise = session.exercises[exIdx]
        const allDone = exercise.sets.every((s) => s.done)
        const isCollapsed = collapse[exercise.exerciseId] ?? allDone
        const timed = exercise.mode === "time"
        const doneCount = exercise.sets.filter((s) => s.done).length
        const target = timed ? `${exercise.targetReps}s` : exercise.targetReps

        // ——— weight sync: what today uses vs. what the program has stored
        const template = program?.workouts
          .find((w) => w.id === session.workoutId)
          ?.exercises.find((e) => e.id === exercise.exerciseId)
        const weights = exercise.sets.map((s) => s.weightKg)
        const savedThis = savedWeights[exercise.exerciseId] === weights.join(",")
        const weightsDiffer =
          !timed && template !== undefined && !sameWeights(weights, plannedWeights(template))
        // offered once the exercise is finished, so she saves a result rather
        // than a mid-workout guess — and it sits outside the collapse below,
        // because finishing every set auto-collapses the card
        const canSave = !timed && allDone && (savedThis || weightsDiffer)

        return (
          <section
            key={exercise.exerciseId}
            className={`animate-rise border bg-surface ${allDone ? "border-volt-dim/50" : "border-line"}`}
            style={{ animationDelay: `${exIdx * 50}ms` }}
          >
            <div className="flex items-stretch border-b border-line">
              {editing === exIdx ? (
                <div className="flex flex-1 items-center gap-1.5 px-2.5 py-2">
                  <input
                    autoFocus
                    className="h-9 min-w-0 flex-1 border border-line bg-raised px-2 text-base font-semibold outline-none focus:border-volt"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && commitRename(exIdx)}
                  />
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-volt text-carbon active:opacity-80"
                    onClick={() => commitRename(exIdx)}
                    aria-label="save name"
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3 text-left"
                    onClick={() =>
                      setCollapse((c) => ({ ...c, [exercise.exerciseId]: !isCollapsed }))
                    }
                  >
                    <h2 className={`font-display text-lg ${allDone ? "text-volt" : ""}`}>
                      {exercise.name}
                    </h2>
                    {isCollapsed ? (
                      <p className="text-xs text-dim">
                        {doneCount}/{exercise.sets.length} sets done
                      </p>
                    ) : (
                      exercise.notes && <p className="text-xs text-dim">{exercise.notes}</p>
                    )}
                  </button>
                  <button
                    type="button"
                    className="flex w-11 shrink-0 items-center justify-center text-faint active:text-ink"
                    onClick={() => {
                      setNameDraft(exercise.name)
                      setEditing(exIdx)
                    }}
                    aria-label={`rename ${exercise.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex shrink-0 items-center gap-1.5 pr-4 pl-1 font-mono text-xs font-bold tabular text-dim"
                    onClick={() =>
                      setCollapse((c) => ({ ...c, [exercise.exerciseId]: !isCollapsed }))
                    }
                    aria-label={isCollapsed ? "expand" : "collapse"}
                  >
                    {exercise.sets.length}×{target}
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-faint transition-transform ${
                        isCollapsed ? "" : "rotate-180"
                      }`}
                    />
                  </button>
                </>
              )}
            </div>

            {!isCollapsed && (
              <>
                <button
                  type="button"
                  className="flex w-full items-center gap-1 border-b border-line/60 px-4 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-faint active:bg-raised"
                  onClick={() => setOpenInfo(openInfo === exIdx ? null : exIdx)}
                >
                  Last sessions & plate math
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${openInfo === exIdx ? "rotate-180" : ""}`}
                  />
                </button>
                {openInfo === exIdx && (
                  <ExerciseInfo
                    exercise={exercise}
                    logs={state.logs}
                    onApplyWeights={(w) => applyWeightsToSets(exIdx, w)}
                  />
                )}
                <div className="divide-y divide-line/60">
                  {exercise.sets.map((set, setIdx) => {
                    const active = hold?.exIdx === exIdx && hold?.setIdx === setIdx
                    const elapsed = active ? Math.round((holdNow - hold.startedAt) / 1000) : 0
                    return (
                      <div key={setIdx} className="flex items-center gap-1.5 px-2.5 py-2">
                        <span className="w-5 shrink-0 font-mono text-xs font-bold text-faint">
                          {setIdx + 1}
                        </span>
                        {timed ? (
                          active ? (
                            <div className="flex min-w-0 flex-1 items-center justify-center font-mono text-2xl font-bold tabular text-volt">
                              {fmtClock(elapsed)}
                            </div>
                          ) : (
                            <Stepper
                              className="min-w-0 flex-1"
                              value={set.reps}
                              step={5}
                              suffix="s"
                              onChange={(reps) => patchSet(exIdx, setIdx, { reps })}
                            />
                          )
                        ) : (
                          <>
                            <Stepper
                              className="min-w-0 flex-1"
                              value={set.reps}
                              step={1}
                              onChange={(reps) => patchSet(exIdx, setIdx, { reps })}
                            />
                            <Stepper
                              className="min-w-0 flex-[1.2]"
                              value={set.weightKg}
                              step={2.5}
                              suffix="kg"
                              onChange={(weightKg) => patchSet(exIdx, setIdx, { weightKg })}
                            />
                          </>
                        )}
                        {timed &&
                          (active ? (
                            <button
                              type="button"
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-volt text-carbon active:opacity-80"
                              onClick={stopHold}
                              aria-label="stop timer"
                            >
                              <Square className="h-4 w-4" fill="currentColor" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line text-volt active:bg-raised"
                              onClick={() => startHold(exIdx, setIdx)}
                              aria-label="start timer"
                            >
                              <Play className="h-4 w-4" fill="currentColor" />
                            </button>
                          ))}
                        <button
                          type="button"
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            set.done
                              ? "animate-punch bg-volt text-carbon"
                              : "border border-line text-faint active:bg-raised"
                          }`}
                          onClick={() => toggleSet(exIdx, setIdx)}
                          aria-label={`set ${setIdx + 1} ${set.done ? "done" : "not done"}`}
                        >
                          <Check className="h-5 w-5" strokeWidth={3} />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-1 border-t border-line/60 py-2 text-xs font-semibold uppercase tracking-wide text-dim active:bg-raised"
                  onClick={() => addSet(exIdx)}
                >
                  <Plus className="h-3.5 w-3.5" /> Add set
                </button>
              </>
            )}

            {canSave &&
              (savedThis ? (
                <p className="flex w-full items-center justify-center gap-1.5 border-t border-volt-dim/40 bg-volt/10 py-2.5 text-xs font-bold uppercase tracking-wide text-volt">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  Saved for next time
                </p>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-1.5 border-t border-volt-dim/40 py-2.5 text-xs font-bold uppercase tracking-wide text-volt active:bg-raised"
                  onClick={() => saveWeights(exIdx)}
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  Save {fmtWeights(weights)}kg for next time
                </button>
              ))}
          </section>
        )
      })}

      {addingExercise ? (
        <AddExerciseForm onAdd={addExercise} onCancel={() => setAddingExercise(false)} />
      ) : (
        <button
          type="button"
          className="flex h-12 w-full items-center justify-center gap-1.5 border border-dashed border-line text-sm font-semibold uppercase tracking-wide text-dim active:bg-raised"
          onClick={() => setAddingExercise(true)}
        >
          <Plus className="h-4 w-4" /> Add exercise
        </button>
      )}

      {session.cardio && (
        <section
          className={`animate-rise border bg-surface ${session.cardio.done ? "border-volt-dim/50" : "border-line"}`}
        >
          <header className="flex items-center gap-2 border-b border-line px-4 py-3">
            <Footprints className="h-4 w-4 text-volt" />
            <h2 className={`font-display text-lg ${session.cardio.done ? "text-volt" : ""}`}>
              {CARDIO_LABELS[session.cardio.type]}
            </h2>
          </header>
          <div className="flex items-center gap-1.5 px-2.5 py-2">
            <Stepper
              className="min-w-0 flex-1"
              value={session.cardio.minutes}
              step={5}
              suffix="min"
              onChange={(minutes) => update({ ...session, cardio: { ...session.cardio!, minutes } })}
            />
            <Stepper
              className="min-w-0 flex-1"
              value={session.cardio.distanceKm ?? 0}
              step={0.5}
              suffix="km"
              onChange={(distanceKm) =>
                update({
                  ...session,
                  cardio: { ...session.cardio!, distanceKm: distanceKm || undefined },
                })
              }
            />
            <button
              type="button"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors ${
                session.cardio.done
                  ? "animate-punch bg-volt text-carbon"
                  : "border border-line text-faint active:bg-raised"
              }`}
              onClick={() =>
                update({ ...session, cardio: { ...session.cardio!, done: !session.cardio!.done } })
              }
              aria-label={`cardio ${session.cardio.done ? "done" : "not done"}`}
            >
              <Check className="h-5 w-5" strokeWidth={3} />
            </button>
          </div>
        </section>
      )}

      <button
        type="button"
        className="flex h-14 w-full items-center justify-center gap-2 bg-volt font-display text-lg text-carbon active:opacity-90"
        onClick={() => (pct < 100 ? setConfirmFinish(true) : finish())}
      >
        <CheckCircle2 className="h-5 w-5" /> Finish workout
      </button>

      {celebration && (
        <Celebration
          workoutName={celebration.workoutName}
          prs={celebration.prs}
          onClose={dismissCelebration}
        />
      )}

      <RestTimerBar
        timer={timer}
        onDismiss={() => setTimer(null)}
        onExtend={(s) =>
          setTimer((t) => (t ? { ...t, endsAt: t.endsAt + s * 1000, totalSeconds: t.totalSeconds + s } : t))
        }
      />

      <Confirm
        open={persist !== null}
        title="Keep this change?"
        body={persist?.body ?? ""}
        tone="accent"
        confirmLabel="Keep it"
        cancelLabel="Just today"
        onConfirm={() => persist?.run()}
        onClose={() => setPersist(null)}
      />
      <Confirm
        open={confirmDiscard}
        title="Discard workout?"
        body="This session's sets will be lost. This cannot be undone."
        confirmLabel="Discard"
        onConfirm={discard}
        onClose={() => setConfirmDiscard(false)}
      />
      <Confirm
        open={confirmFinish}
        title={`Finish at ${pct}%?`}
        body={`Only ${pct}% of sets are checked off. Unchecked sets won't count toward progression.`}
        confirmLabel="Finish"
        onConfirm={finish}
        onClose={() => setConfirmFinish(false)}
      />
    </div>
  )
}

/**
 * Last sessions for this exercise plus the barbell plate math. Rows whose
 * weights differ from today's are tappable — she already opens this panel to
 * read past weights, so reusing them shouldn't cost a second control.
 */
function ExerciseInfo({
  exercise,
  logs,
  onApplyWeights,
}: {
  exercise: ExerciseLog
  logs: WorkoutLog[]
  onApplyWeights: (weights: number[]) => void
}) {
  const history = recentHistory(logs, exercise)
  const timed = exercise.mode === "time"
  const current = exercise.sets.map((s) => s.weightKg)
  const workingSet = exercise.sets.find((s) => !s.done) ?? exercise.sets[exercise.sets.length - 1]
  const plates =
    !timed && workingSet && workingSet.weightKg > 0 ? platesPerSide(workingSet.weightKg) : null

  // that session's column stretched over today's set count
  const columnFor = (h: (typeof history)[number]) =>
    exercise.sets.map((_, i) => h.weights[i] ?? h.weights[h.weights.length - 1])
  const rows = history.map((h) => {
    const weights = columnFor(h)
    return { ...h, weights, reusable: !timed && !sameWeights(weights, current) }
  })

  return (
    <div className="space-y-2 border-b border-line bg-raised/40 px-4 py-3">
      {rows.length === 0 ? (
        <p className="text-xs text-dim">First time — no history for this exercise yet.</p>
      ) : (
        <ul>
          {rows.map((h) => {
            const body = (
              <>
                <span className="text-dim">{fmtDate(h.date)}</span>
                <span className="flex items-center gap-1.5 font-mono font-bold tabular text-dim">
                  {timed ? (
                    <span className="text-ink">{h.reps.join("/")}s held</span>
                  ) : (
                    <>
                      {h.reps.join("/")} <span className="text-ink">@ {fmtKg(h.topKg)}kg</span>
                    </>
                  )}
                  <CornerDownLeft
                    className={`h-3 w-3 ${h.reusable ? "text-volt" : "text-transparent"}`}
                  />
                </span>
              </>
            )
            return (
              <li key={h.date}>
                {h.reusable ? (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between py-1.5 text-left text-xs active:bg-raised"
                    onClick={() => onApplyWeights(h.weights)}
                    aria-label={`use ${fmtWeights(h.weights)}kg from ${fmtDate(h.date)}`}
                  >
                    {body}
                  </button>
                ) : (
                  <div className="flex items-center justify-between py-1.5 text-xs">{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {rows.some((h) => h.reusable) && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">
          Tap a session to reuse its weights
        </p>
      )}
      {plates !== null && (
        <p className="font-mono text-[11px] font-bold text-faint">
          {BAR_KG}kg bar{" "}
          <span className="text-volt-dim">
            {plates.length > 0 ? `+ ${plates.map(fmtKg).join(" + ")} per side` : "· empty bar"}
          </span>
        </p>
      )}
    </div>
  )
}

interface NewExercise {
  name: string
  mode: "reps" | "time"
  sets: number
  targetReps: number
  weightKg: number
  restSeconds: number
}

/** Inline form for bolting an extra exercise onto the current session. */
function AddExerciseForm({
  onAdd,
  onCancel,
}: {
  onAdd: (fields: NewExercise) => void
  onCancel: () => void
}) {
  const [name, setName] = useState("")
  const [mode, setMode] = useState<"reps" | "time">("reps")
  const [sets, setSets] = useState(3)
  const [targetReps, setTargetReps] = useState(10)
  const [weightKg, setWeightKg] = useState(20)
  const [restSeconds, setRestSeconds] = useState(90)
  const timed = mode === "time"

  return (
    <div className="animate-rise border border-line bg-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-dim">Add exercise</p>
      <input
        autoFocus
        className="mt-2 h-11 w-full border border-line bg-raised px-3 text-sm font-semibold outline-none placeholder:text-faint focus:border-volt"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Exercise name"
      />
      <div className="mt-2 flex gap-2">
        {(["reps", "time"] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={`h-10 flex-1 border text-xs font-bold uppercase tracking-wide ${
              mode === m ? "border-volt bg-volt text-carbon" : "border-line text-dim active:bg-raised"
            }`}
            onClick={() => setMode(m)}
          >
            {m === "reps" ? "Reps & weight" : "Timed hold"}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Field label="Sets">
          <Stepper value={sets} step={1} min={1} onChange={setSets} />
        </Field>
        <Field label={timed ? "Seconds" : "Reps"}>
          <Stepper
            value={targetReps}
            step={timed ? 5 : 1}
            min={1}
            suffix={timed ? "s" : undefined}
            onChange={setTargetReps}
          />
        </Field>
        {!timed && (
          <Field label="Weight">
            <Stepper value={weightKg} step={2.5} suffix="kg" onChange={setWeightKg} />
          </Field>
        )}
        <Field label="Rest">
          <Stepper value={restSeconds} step={15} suffix="s" onChange={setRestSeconds} />
        </Field>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="h-12 flex-1 border border-line font-semibold uppercase tracking-wide text-dim active:bg-raised"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="h-12 flex-1 bg-volt font-semibold uppercase tracking-wide text-carbon active:opacity-80 disabled:opacity-40"
          disabled={!name.trim()}
          onClick={() =>
            onAdd({ name: name.trim(), mode, sets, targetReps, weightKg: timed ? 0 : weightKg, restSeconds })
          }
        >
          Add
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
