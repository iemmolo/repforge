import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, CheckCircle2, ChevronDown, Footprints, Pencil, Play, Plus, Square, X } from "lucide-react"
import { useStore } from "@/lib/store"
import { Stepper } from "@/components/stepper"
import { Confirm } from "@/components/confirm"
import { Celebration } from "@/components/celebration"
import { RestTimerBar, type RestTimer } from "@/components/rest-timer"
import { detectPRs, type PR } from "@/lib/gamify"
import { BAR_KG, CARDIO_LABELS, completionPercent, fmtClock, fmtDate, fmtKg, platesPerSide, uid } from "@/lib/utils"
import type { Exercise, ExerciseLog, Program, Session, WorkoutLog } from "@/types"

/** Last n outings for this exercise (matched by name, newest first). */
function recentHistory(logs: WorkoutLog[], name: string, n = 3) {
  const out: { date: string; reps: number[]; topKg: number }[] = []
  for (const l of logs) {
    const e = l.exercises.find((e) => e.name === name)
    if (!e) continue
    const done = e.sets.filter((s) => s.done)
    if (done.length === 0) continue
    out.push({
      date: l.date,
      reps: done.map((s) => s.reps),
      topKg: Math.max(...done.map((s) => s.weightKg)),
    })
    if (out.length === n) break
  }
  return out
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

  function startRest(label: string, seconds: number) {
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
    if (!program || !session) return
    const next: Program = {
      ...program,
      workouts: program.workouts.map((w) =>
        w.id !== session.workoutId
          ? w
          : { ...w, exercises: w.exercises.map((e) => (e.id === exerciseId ? { ...e, ...patch } : e)) },
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

      {session.exercises.map((exercise, exIdx) => {
        const allDone = exercise.sets.every((s) => s.done)
        const isCollapsed = collapse[exercise.exerciseId] ?? allDone
        const timed = exercise.mode === "time"
        const doneCount = exercise.sets.filter((s) => s.done).length
        const target = timed ? `${exercise.targetReps}s` : exercise.targetReps
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
                {openInfo === exIdx && <ExerciseInfo exercise={exercise} logs={state.logs} />}
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

/** Last sessions for this exercise plus the barbell plate math for the working weight. */
function ExerciseInfo({ exercise, logs }: { exercise: ExerciseLog; logs: WorkoutLog[] }) {
  const history = recentHistory(logs, exercise.name)
  const timed = exercise.mode === "time"
  const workingSet = exercise.sets.find((s) => !s.done) ?? exercise.sets[exercise.sets.length - 1]
  const plates =
    !timed && workingSet && workingSet.weightKg > 0 ? platesPerSide(workingSet.weightKg) : null

  return (
    <div className="space-y-2 border-b border-line bg-raised/40 px-4 py-3">
      {history.length === 0 ? (
        <p className="text-xs text-dim">First time — no history for this exercise yet.</p>
      ) : (
        <ul className="space-y-1">
          {history.map((h) => (
            <li key={h.date} className="flex items-center justify-between text-xs">
              <span className="text-dim">{fmtDate(h.date)}</span>
              <span className="font-mono font-bold tabular text-dim">
                {timed ? (
                  <span className="text-ink">{h.reps.join("/")}s held</span>
                ) : (
                  <>
                    {h.reps.join("/")} <span className="text-ink">@ {fmtKg(h.topKg)}kg</span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
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
