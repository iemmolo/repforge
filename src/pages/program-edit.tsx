import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ChevronDown, Copy, Footprints, Plus, RotateCcw, Trash2 } from "lucide-react"
import { useStore } from "@/lib/store"
import { PRESET_PROGRAMS } from "@/lib/seed"
import { Stepper } from "@/components/stepper"
import { Picker } from "@/components/picker"
import { Confirm } from "@/components/confirm"
import { CARDIO_LABELS, DAY_LABELS, WEEK_DAYS, uid } from "@/lib/utils"
import type { CardioType, Exercise, Program, Workout } from "@/types"

export default function ProgramEditPage() {
  const { programId } = useParams()
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const program = state.programs.find((p) => p.id === programId)
  const [openWorkout, setOpenWorkout] = useState<string | null>(program?.workouts[0]?.id ?? null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)

  if (!program) {
    return (
      <div className="mt-16 text-center">
        <p className="font-display text-2xl text-faint">Program not found</p>
      </div>
    )
  }

  const isPreset = PRESET_PROGRAMS.some((p) => p.id === program.id)

  function save(next: Program) {
    dispatch({ type: "saveProgram", program: next })
  }

  function patchWorkout(workoutId: string, patch: Partial<Workout>) {
    if (!program) return
    save({
      ...program,
      workouts: program.workouts.map((w) => (w.id === workoutId ? { ...w, ...patch } : w)),
    })
  }

  function patchExercise(workoutId: string, exerciseId: string, patch: Partial<Exercise>) {
    if (!program) return
    save({
      ...program,
      workouts: program.workouts.map((w) =>
        w.id !== workoutId
          ? w
          : {
              ...w,
              exercises: w.exercises.map((e) => (e.id === exerciseId ? { ...e, ...patch } : e)),
            },
      ),
    })
  }

  function addWorkout() {
    if (!program) return
    const workout: Workout = {
      id: uid(),
      name: `Workout ${program.workouts.length + 1}`,
      exercises: [],
    }
    save({ ...program, workouts: [...program.workouts, workout] })
    setOpenWorkout(workout.id)
  }

  function removeWorkout(workoutId: string) {
    if (!program) return
    save({
      ...program,
      workouts: program.workouts.filter((w) => w.id !== workoutId),
      schedule: Object.fromEntries(
        Object.entries(program.schedule).filter(([, wid]) => wid !== workoutId),
      ),
    })
  }

  function addExercise(workoutId: string) {
    if (!program) return
    const workout = program.workouts.find((w) => w.id === workoutId)
    if (!workout) return
    const exercise: Exercise = {
      id: uid(),
      name: "New Exercise",
      sets: 3,
      targetReps: 10,
      weightKg: 20,
      incrementKg: 2.5,
      restSeconds: 90,
    }
    patchWorkout(workoutId, { exercises: [...workout.exercises, exercise] })
  }

  function removeExercise(workoutId: string, exerciseId: string) {
    if (!program) return
    const workout = program.workouts.find((w) => w.id === workoutId)
    if (!workout) return
    patchWorkout(workoutId, { exercises: workout.exercises.filter((e) => e.id !== exerciseId) })
  }

  function duplicate() {
    if (!program) return
    const idMap = new Map(program.workouts.map((w) => [w.id, uid()]))
    const copy: Program = {
      ...program,
      id: uid(),
      name: `${program.name} (copy)`,
      schedule: Object.fromEntries(
        Object.entries(program.schedule).map(([d, wid]) => [d, idMap.get(wid) ?? wid]),
      ),
      workouts: program.workouts.map((w) => ({
        ...w,
        id: idMap.get(w.id)!,
        exercises: w.exercises.map((e) => ({ ...e })),
        cardio: w.cardio ? { ...w.cardio } : undefined,
      })),
    }
    dispatch({ type: "saveProgram", program: copy })
    navigate(`/programs/${copy.id}`)
  }

  const workoutOptions = [
    { value: "", label: "Rest" },
    ...program.workouts.map((w) => ({ value: w.id, label: w.name })),
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center border border-line text-dim active:bg-raised"
          onClick={() => navigate("/programs")}
          aria-label="back to programs"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-2xl">Edit Program</h1>
      </div>

      {/* Name + tagline */}
      <div className="animate-rise space-y-2 border border-line bg-surface p-4">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-dim">Name</span>
          <input
            className="mt-1 h-11 w-full border border-line bg-raised px-3 font-semibold outline-none focus:border-volt"
            value={program.name}
            onChange={(e) => save({ ...program, name: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-dim">Tagline</span>
          <input
            className="mt-1 h-11 w-full border border-line bg-raised px-3 text-sm outline-none focus:border-volt"
            value={program.tagline}
            onChange={(e) => save({ ...program, tagline: e.target.value })}
            placeholder="What is this program for?"
          />
        </label>
      </div>

      {/* Schedule */}
      <div className="animate-rise stagger-1 border border-line bg-surface p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-dim">Schedule</p>
        <div className="mt-2 flex gap-2">
          {(["weekly", "cycle"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`h-10 flex-1 border text-xs font-bold uppercase tracking-wide ${
                (program.scheduleMode ?? "weekly") === mode
                  ? "border-volt bg-volt text-carbon"
                  : "border-line text-dim active:bg-raised"
              }`}
              onClick={() => save({ ...program, scheduleMode: mode })}
            >
              {mode === "weekly" ? "Fixed weekdays" : "Rotation"}
            </button>
          ))}
        </div>

        {(program.scheduleMode ?? "weekly") === "weekly" ? (
          <div className="mt-3 space-y-1.5">
            {WEEK_DAYS.map((day) => (
              <div key={day} className="flex items-center gap-2">
                <span className="w-10 shrink-0 font-mono text-xs font-bold uppercase text-faint">
                  {DAY_LABELS[day]}
                </span>
                <Picker
                  className="min-w-0 flex-1"
                  value={program.schedule[day] ?? ""}
                  options={workoutOptions}
                  onChange={(value) => {
                    const schedule = { ...program.schedule }
                    if (value) schedule[day] = value
                    else delete schedule[day]
                    save({ ...program, schedule })
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-dim">
              Workouts run in order, top to bottom, on whatever days you train — Today always
              offers the one after your last logged session.
            </p>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
                Target days per week
              </span>
              <div className="mt-1 max-w-40">
                <Stepper
                  value={program.daysPerWeek ?? 3}
                  step={1}
                  min={1}
                  onChange={(daysPerWeek) => save({ ...program, daysPerWeek })}
                />
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Workouts */}
      {program.workouts.map((workout, i) => {
        const open = openWorkout === workout.id
        return (
          <div
            key={workout.id}
            className="animate-rise border border-line bg-surface"
            style={{ animationDelay: `${(i + 2) * 50}ms` }}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3.5"
              onClick={() => setOpenWorkout(open ? null : workout.id)}
            >
              <span className="font-display text-lg">{workout.name}</span>
              <span className="flex items-center gap-2 text-xs text-faint">
                {workout.exercises.length} exercises
                {workout.cardio && <Footprints className="h-3.5 w-3.5 text-volt-dim" />}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </span>
            </button>
            {open && (
              <div className="space-y-3 border-t border-line px-4 py-3">
                <input
                  className="h-11 w-full border border-line bg-raised px-3 font-semibold outline-none focus:border-volt"
                  value={workout.name}
                  onChange={(e) => patchWorkout(workout.id, { name: e.target.value })}
                />
                {workout.exercises.map((e) => (
                  <ExerciseEditor
                    key={e.id}
                    exercise={e}
                    onChange={(patch) => patchExercise(workout.id, e.id, patch)}
                    onRemove={() => removeExercise(workout.id, e.id)}
                  />
                ))}

                <CardioEditor
                  cardio={workout.cardio}
                  onChange={(cardio) => patchWorkout(workout.id, { cardio })}
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 border border-dashed border-line text-sm font-semibold text-dim active:bg-raised"
                    onClick={() => addExercise(workout.id)}
                  >
                    <Plus className="h-4 w-4" /> Add exercise
                  </button>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center border border-line text-danger active:bg-raised"
                    onClick={() => removeWorkout(workout.id)}
                    aria-label="delete workout"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button
        type="button"
        className="flex h-12 w-full items-center justify-center gap-1.5 border border-dashed border-line font-semibold uppercase tracking-wide text-dim active:bg-raised"
        onClick={addWorkout}
      >
        <Plus className="h-4 w-4" /> Add workout
      </button>

      {/* Program actions */}
      <div className="flex gap-2">
        <button
          type="button"
          className="flex h-12 flex-1 items-center justify-center gap-1.5 border border-line text-xs font-semibold uppercase tracking-wide text-dim active:bg-raised"
          onClick={duplicate}
        >
          <Copy className="h-4 w-4" /> Duplicate
        </button>
        {isPreset && (
          <button
            type="button"
            className="flex h-12 flex-1 items-center justify-center gap-1.5 border border-line text-xs font-semibold uppercase tracking-wide text-dim active:bg-raised"
            onClick={() => setConfirmRestore(true)}
          >
            <RotateCcw className="h-4 w-4" /> Restore
          </button>
        )}
        {state.programs.length > 1 && (
          <button
            type="button"
            className="flex h-12 flex-1 items-center justify-center gap-1.5 border border-line text-xs font-semibold uppercase tracking-wide text-danger active:bg-raised"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
      </div>

      <Confirm
        open={confirmRestore}
        title="Restore preset?"
        body={`"${program.name}" goes back to its original workouts, weights, and schedule. Your edits to it are lost. Logs are untouched.`}
        confirmLabel="Restore"
        onConfirm={() => dispatch({ type: "restoreProgram", programId: program.id })}
        onClose={() => setConfirmRestore(false)}
      />
      <Confirm
        open={confirmDelete}
        title="Delete program?"
        body="The program and its workouts are removed. Past logs stay in history."
        confirmLabel="Delete"
        onConfirm={() => {
          dispatch({ type: "deleteProgram", programId: program.id })
          navigate("/programs")
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function CardioEditor({
  cardio,
  onChange,
}: {
  cardio?: { type: CardioType; minutes: number; distanceKm?: number }
  onChange: (cardio?: { type: CardioType; minutes: number; distanceKm?: number }) => void
}) {
  return (
    <div className="border border-line/70 bg-raised/50 p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
        <Footprints className="h-3.5 w-3.5" /> Cardio
      </p>
      <div className="mt-2 flex gap-2">
        {([undefined, "walk", "run"] as const).map((t) => (
          <button
            key={t ?? "none"}
            type="button"
            className={`h-10 flex-1 border text-xs font-bold uppercase tracking-wide ${
              cardio?.type === t || (!cardio && !t)
                ? "border-volt bg-volt text-carbon"
                : "border-line text-dim active:bg-raised"
            }`}
            onClick={() =>
              onChange(t ? { type: t, minutes: cardio?.minutes ?? 20, distanceKm: cardio?.distanceKm } : undefined)
            }
          >
            {t ? CARDIO_LABELS[t] : "None"}
          </button>
        ))}
      </div>
      {cardio && (
        <div className="mt-2 flex gap-2">
          <Stepper
            className="min-w-0 flex-1"
            value={cardio.minutes}
            step={5}
            min={5}
            suffix="min"
            onChange={(minutes) => onChange({ ...cardio, minutes })}
          />
          <Stepper
            className="min-w-0 flex-1"
            value={cardio.distanceKm ?? 0}
            step={0.5}
            suffix="km"
            onChange={(distanceKm) => onChange({ ...cardio, distanceKm: distanceKm || undefined })}
          />
        </div>
      )}
    </div>
  )
}

function ExerciseEditor({
  exercise,
  onChange,
  onRemove,
}: {
  exercise: Exercise
  onChange: (patch: Partial<Exercise>) => void
  onRemove: () => void
}) {
  return (
    <div className="border border-line/70 bg-raised/50 p-3">
      <div className="flex items-center gap-2">
        <input
          className="h-11 min-w-0 flex-1 border border-line bg-raised px-3 text-sm font-semibold outline-none focus:border-volt"
          value={exercise.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-faint active:text-danger"
          onClick={onRemove}
          aria-label="remove exercise"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
        <Field label="Sets">
          <Stepper value={exercise.sets} step={1} min={1} onChange={(sets) => onChange({ sets })} />
        </Field>
        <Field label="Reps">
          <Stepper
            value={exercise.targetReps}
            step={1}
            min={1}
            onChange={(targetReps) => onChange({ targetReps })}
          />
        </Field>
        <Field label="Weight">
          <Stepper
            value={exercise.weightKg}
            step={2.5}
            suffix="kg"
            onChange={(weightKg) => onChange({ weightKg })}
          />
        </Field>
        <Field label="Increment">
          <Stepper
            value={exercise.incrementKg}
            step={0.5}
            suffix="kg"
            onChange={(incrementKg) => onChange({ incrementKg })}
          />
        </Field>
        <Field label="Rest">
          <Stepper
            value={exercise.restSeconds}
            step={15}
            suffix="s"
            onChange={(restSeconds) => onChange({ restSeconds })}
          />
        </Field>
      </div>
      <input
        className="mt-2 h-10 w-full border border-line bg-raised px-3 text-xs outline-none placeholder:text-faint focus:border-volt"
        value={exercise.notes ?? ""}
        onChange={(e) => onChange({ notes: e.target.value || undefined })}
        placeholder="Notes (e.g. per dumbbell, reps = seconds)"
      />
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
