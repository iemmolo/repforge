import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CalendarCheck, Check, Download, Eye, Footprints, PackagePlus, Pencil, Plus, Star, Upload } from "lucide-react"
import { useStore } from "@/lib/store"
import { PRESET_BY_ID, PRESET_PROGRAMS } from "@/lib/seed"
import { CARDIO_LABELS, CATEGORY_LABELS, downloadBackup, fmtKg, uid } from "@/lib/utils"
import type { AppState, Program } from "@/types"

const CATEGORY_ORDER = ["strength", "hypertrophy", "classics", "minimalist", "recovery"] as const

function categoryOf(p: Program): string | undefined {
  return p.category ?? PRESET_BY_ID.get(p.id)?.category
}

export default function ProgramsPage() {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const favorites = state.programs.filter((p) => p.favorite)
  const rest = state.programs.filter((p) => !p.favorite)
  const custom = rest.filter((p) => !PRESET_BY_ID.has(p.id))
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    programs: rest.filter((p) => categoryOf(p) === cat),
  })).filter((g) => g.programs.length > 0)
  const missingPresets = PRESET_PROGRAMS.some((p) => !state.programs.some((s) => s.id === p.id))

  function newProgram() {
    const program: Program = {
      id: uid(),
      name: "New Program",
      tagline: "",
      schedule: {},
      workouts: [],
    }
    dispatch({ type: "saveProgram", program })
    navigate(`/programs/${program.id}`)
  }

  function exportData() {
    downloadBackup(state)
    dispatch({ type: "markExported" })
  }

  function importData(file: File) {
    file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as AppState
        if (parsed.version !== 1 || !Array.isArray(parsed.programs)) throw new Error("bad shape")
        dispatch({ type: "importState", state: parsed })
      } catch {
        alert("That file doesn't look like a Repforge backup.")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Programs</h1>
        <button
          type="button"
          className="flex h-11 items-center gap-1.5 bg-volt px-3.5 text-sm font-bold uppercase tracking-wide text-carbon active:opacity-80"
          onClick={newProgram}
        >
          <Plus className="h-4 w-4" strokeWidth={3} /> New
        </button>
      </div>

      <p className="text-xs text-dim">
        Tap a program to make it active. Star your go-tos. Edit for workouts, schedule,
        duplicate, or restore.
      </p>

      {favorites.length > 0 && <ProgramSection title="★ Favorites" programs={favorites} />}
      {custom.length > 0 && <ProgramSection title="Your programs" programs={custom} />}
      {byCategory.map((g) => (
        <ProgramSection key={g.cat} title={CATEGORY_LABELS[g.cat]} programs={g.programs} />
      ))}

      {missingPresets && (
        <button
          type="button"
          className="flex h-12 w-full items-center justify-center gap-1.5 border border-dashed border-line text-sm font-semibold uppercase tracking-wide text-dim active:bg-raised"
          onClick={() => dispatch({ type: "loadPresets" })}
        >
          <PackagePlus className="h-4 w-4" /> Load missing presets
        </button>
      )}

      <div className="border border-line bg-surface p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-dim">Data</p>
        <p className="mt-1 text-xs text-faint">
          Everything lives in this browser. Export a backup now and then.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="flex h-11 flex-1 items-center justify-center gap-1.5 border border-line text-sm font-semibold text-dim active:bg-raised"
            onClick={exportData}
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            type="button"
            className="flex h-11 flex-1 items-center justify-center gap-1.5 border border-line text-sm font-semibold text-dim active:bg-raised"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importData(f)
              e.target.value = ""
            }}
          />
        </div>
      </div>
    </div>
  )
}

function ProgramSection({ title, programs }: { title: string; programs: Program[] }) {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const [previewId, setPreviewId] = useState<string | null>(null)

  return (
    <div className="animate-rise">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">{title}</p>
      <div className="divide-y divide-line/60 border border-line bg-surface">
        {programs.map((p) => {
          const active = p.id === state.activeProgramId
          const preview = previewId === p.id
          const days =
            p.scheduleMode === "cycle"
              ? `${p.daysPerWeek ?? 3} days/week · rotating`
              : `${Object.keys(p.schedule).length} days/week`
          return (
            <div key={p.id}>
              <div className="flex items-stretch">
                <button
                  type="button"
                  className={`min-w-0 flex-1 px-4 py-3 text-left active:bg-raised ${
                    active ? "border-l-2 border-volt" : "border-l-2 border-transparent"
                  }`}
                  onClick={() => dispatch({ type: "selectProgram", programId: p.id })}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-display truncate text-base ${active ? "text-volt" : ""}`}>
                      {p.name}
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-volt" strokeWidth={3} />}
                  </div>
                  <p className="text-xs text-faint">
                    {p.workouts.length} workouts · {days}
                  </p>
                </button>
                <button
                  type="button"
                  className={`flex w-11 shrink-0 items-center justify-center active:bg-raised ${
                    preview ? "text-volt" : "text-faint"
                  }`}
                  onClick={() => setPreviewId(preview ? null : p.id)}
                  aria-label={`preview ${p.name}`}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={`flex w-11 shrink-0 items-center justify-center active:bg-raised ${
                    p.favorite ? "text-volt" : "text-faint"
                  }`}
                  onClick={() => dispatch({ type: "toggleFavorite", programId: p.id })}
                  aria-label={`${p.favorite ? "unfavorite" : "favorite"} ${p.name}`}
                >
                  <Star className="h-4 w-4" fill={p.favorite ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  className="flex w-11 shrink-0 items-center justify-center text-faint active:bg-raised active:text-ink"
                  onClick={() => navigate(`/programs/${p.id}`)}
                  aria-label={`edit ${p.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              {preview && <ProgramPreview program={p} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Read-only look inside a program before committing to it. */
function ProgramPreview({ program }: { program: Program }) {
  return (
    <div className="space-y-3 border-t border-line/60 bg-raised/40 px-4 py-3">
      {program.tagline && <p className="text-xs text-dim">{program.tagline}</p>}
      {program.workouts.map((w) => (
        <div key={w.id}>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-volt-dim">
            {w.kind === "class" && <CalendarCheck className="h-3.5 w-3.5" />}
            {w.name}
          </p>
          {w.kind === "class" ? (
            <p className="mt-1 text-xs text-dim">Class · {w.classMinutes ?? 60} min</p>
          ) : (
            <ul className="mt-1 space-y-0.5">
              {w.exercises.map((e) => (
                <li key={e.id} className="flex justify-between text-xs">
                  <span className="text-dim">{e.name}</span>
                  <span className="font-mono font-bold tabular text-faint">
                    {e.sets}×{e.targetReps}
                    {e.weightKg > 0 && ` @ ${fmtKg(e.weightKg)}kg`}
                  </span>
                </li>
              ))}
              {w.cardio && (
                <li className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-dim">
                    <Footprints className="h-3 w-3" /> {CARDIO_LABELS[w.cardio.type]}
                  </span>
                  <span className="font-mono font-bold tabular text-faint">
                    {w.cardio.minutes}min
                  </span>
                </li>
              )}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
