import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, CheckCircle2, ChevronDown, Footprints, X } from "lucide-react"
import { useStore } from "@/lib/store"
import { Stepper } from "@/components/stepper"
import { Confirm } from "@/components/confirm"
import { Celebration } from "@/components/celebration"
import { RestTimerBar, type RestTimer } from "@/components/rest-timer"
import { detectPRs, type PR } from "@/lib/gamify"
import { BAR_KG, CARDIO_LABELS, completionPercent, fmtDate, fmtKg, platesPerSide } from "@/lib/utils"
import type { ExerciseLog, Session, WorkoutLog } from "@/types"

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

export default function SessionPage() {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const [timer, setTimer] = useState<RestTimer | null>(null)
  const [openInfo, setOpenInfo] = useState<number | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [celebration, setCelebration] = useState<{ workoutName: string; prs: PR[] } | null>(null)

  const session = state.session
  if (!session) {
    // finished or discarded — nothing to render here
    return null
  }

  const pct = completionPercent(session.exercises, session.cardio)

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
      setTimer({
        endsAt: Date.now() + exercise.restSeconds * 1000,
        totalSeconds: exercise.restSeconds,
        label: exercise.name,
      })
    }
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
        return (
          <section
            key={exercise.exerciseId}
            className={`animate-rise border bg-surface ${allDone ? "border-volt-dim/50" : "border-line"}`}
            style={{ animationDelay: `${exIdx * 50}ms` }}
          >
            <button
              type="button"
              className="flex w-full items-baseline justify-between border-b border-line px-4 py-3 text-left"
              onClick={() => setOpenInfo(openInfo === exIdx ? null : exIdx)}
            >
              <div>
                <h2 className={`font-display text-lg ${allDone ? "text-volt" : ""}`}>
                  {exercise.name}
                </h2>
                {exercise.notes && <p className="text-xs text-dim">{exercise.notes}</p>}
              </div>
              <span className="flex items-center gap-1.5 font-mono text-xs font-bold tabular text-dim">
                {exercise.targetSets}×{exercise.targetReps}
                <ChevronDown
                  className={`h-3.5 w-3.5 text-faint transition-transform ${
                    openInfo === exIdx ? "rotate-180" : ""
                  }`}
                />
              </span>
            </button>
            {openInfo === exIdx && <ExerciseInfo exercise={exercise} logs={state.logs} />}
            <div className="divide-y divide-line/60">
              {exercise.sets.map((set, setIdx) => (
                <div key={setIdx} className="flex items-center gap-1.5 px-2.5 py-2">
                  <span className="w-5 shrink-0 font-mono text-xs font-bold text-faint">
                    {setIdx + 1}
                  </span>
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
              ))}
            </div>
          </section>
        )
      })}

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
  const workingSet = exercise.sets.find((s) => !s.done) ?? exercise.sets[exercise.sets.length - 1]
  const plates = workingSet && workingSet.weightKg > 0 ? platesPerSide(workingSet.weightKg) : null

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
                {h.reps.join("/")} <span className="text-ink">@ {fmtKg(h.topKg)}kg</span>
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
