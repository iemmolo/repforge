import { useState } from "react"
import { ChevronDown, Trash2 } from "lucide-react"
import { useStore } from "@/lib/store"
import { Confirm } from "@/components/confirm"
import { completionPercent, fmtDate, fmtKg } from "@/lib/utils"

export default function HistoryPage() {
  const { state, dispatch } = useStore()
  const [openId, setOpenId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  if (state.logs.length === 0) {
    return (
      <div className="animate-rise mt-16 text-center">
        <p className="font-display text-3xl text-faint">No logs yet</p>
        <p className="mt-2 text-sm text-dim">Finish your first workout and it'll show up here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h1 className="font-display text-2xl">History</h1>
      {state.logs.map((log, i) => {
        const pct = completionPercent(log.exercises, log.cardio)
        const open = openId === log.id
        return (
          <div
            key={log.id}
            className="animate-rise border border-line bg-surface"
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3.5 text-left"
              onClick={() => setOpenId(open ? null : log.id)}
            >
              <div>
                <p className="font-semibold">{log.workoutName}</p>
                <p className="text-xs text-dim">
                  {fmtDate(log.date)} · {log.programName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`font-mono text-sm font-bold tabular ${
                    log.classMinutes != null || pct === 100 ? "text-volt" : "text-dim"
                  }`}
                >
                  {log.classMinutes != null ? `${log.classMinutes}min` : `${pct}%`}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-faint transition-transform ${open ? "rotate-180" : ""}`}
                />
              </div>
            </button>
            {open && (
              <div className="border-t border-line px-4 py-3">
                <ul className="space-y-1.5">
                  {log.classMinutes != null && (
                    <li className="flex justify-between text-sm">
                      <span>Class</span>
                      <span className="font-mono text-xs font-bold tabular text-dim">
                        {log.classMinutes}min
                      </span>
                    </li>
                  )}
                  {log.exercises.map((e) => {
                    const doneSets = e.sets.filter((s) => s.done)
                    const top = doneSets.reduce((m, s) => Math.max(m, s.weightKg), 0)
                    return (
                      <li key={e.exerciseId} className="flex justify-between text-sm">
                        <span className={doneSets.length === 0 ? "text-faint line-through" : ""}>
                          {e.name}
                        </span>
                        <span className="font-mono text-xs font-bold tabular text-dim">
                          {doneSets.length}/{e.sets.length} sets
                          {top > 0 && <span className="text-ink"> · {fmtKg(top)}kg</span>}
                        </span>
                      </li>
                    )
                  })}
                  {log.cardio && (
                    <li className="flex justify-between text-sm">
                      <span className={log.cardio.done ? "" : "text-faint line-through"}>
                        {log.cardio.type === "walk" ? "Walk" : "Run"}
                      </span>
                      <span className="font-mono text-xs font-bold tabular text-dim">
                        {log.cardio.minutes}min
                        {log.cardio.distanceKm ? (
                          <span className="text-ink"> · {log.cardio.distanceKm}km</span>
                        ) : null}
                      </span>
                    </li>
                  )}
                </ul>
                <button
                  type="button"
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-danger"
                  onClick={() => setDeleteId(log.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete log
                </button>
              </div>
            )}
          </div>
        )
      })}
      <Confirm
        open={deleteId !== null}
        title="Delete this log?"
        body="It will be removed from history and progression calculations."
        confirmLabel="Delete"
        onConfirm={() => deleteId && dispatch({ type: "deleteLog", logId: deleteId })}
        onClose={() => setDeleteId(null)}
      />
    </div>
  )
}
