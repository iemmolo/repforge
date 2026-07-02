import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, CheckCircle2, Footprints, X } from "lucide-react"
import { useStore } from "@/lib/store"
import { Stepper } from "@/components/stepper"
import { Confirm } from "@/components/confirm"
import { RestTimerBar, type RestTimer } from "@/components/rest-timer"
import { CARDIO_LABELS, completionPercent } from "@/lib/utils"
import type { ExerciseLog, Session } from "@/types"

export default function SessionPage() {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const [timer, setTimer] = useState<RestTimer | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)

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

  function finish() {
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
            <header className="flex items-baseline justify-between border-b border-line px-4 py-3">
              <div>
                <h2 className={`font-display text-lg ${allDone ? "text-volt" : ""}`}>
                  {exercise.name}
                </h2>
                {exercise.notes && <p className="text-xs text-dim">{exercise.notes}</p>}
              </div>
              <span className="font-mono text-xs font-bold tabular text-dim">
                {exercise.targetSets}×{exercise.targetReps}
              </span>
            </header>
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
