import { useMemo, useState } from "react"
import { useStore } from "@/lib/store"
import { fmtDate, fmtKg } from "@/lib/utils"

interface Point {
  date: string
  topKg: number
  volume: number
}

export default function ProgressPage() {
  const { state } = useStore()

  // every exercise name that has at least one completed set, most recent first
  const exerciseNames = useMemo(() => {
    const seen = new Map<string, string>() // name -> latest date
    for (const log of state.logs) {
      for (const e of log.exercises) {
        if (e.sets.some((s) => s.done && s.weightKg > 0)) {
          if (!seen.has(e.name) || seen.get(e.name)! < log.date) seen.set(e.name, log.date)
        }
      }
    }
    return [...seen.entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([name]) => name)
  }, [state.logs])

  const [selected, setSelected] = useState<string | null>(null)
  const active = selected ?? exerciseNames[0] ?? null

  const points: Point[] = useMemo(() => {
    if (!active) return []
    const byDate: Point[] = []
    const logs = [...state.logs].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    for (const log of logs) {
      for (const e of log.exercises) {
        if (e.name !== active) continue
        const done = e.sets.filter((s) => s.done)
        if (done.length === 0) continue
        byDate.push({
          date: log.date,
          topKg: Math.max(...done.map((s) => s.weightKg)),
          volume: done.reduce((v, s) => v + s.reps * s.weightKg, 0),
        })
      }
    }
    return byDate
  }, [state.logs, active])

  if (exerciseNames.length === 0) {
    return (
      <div className="animate-rise mt-16 text-center">
        <p className="font-display text-3xl text-faint">Nothing to chart</p>
        <p className="mt-2 text-sm text-dim">Log a few workouts and your lifts will graph here.</p>
      </div>
    )
  }

  const latest = points[points.length - 1]
  const first = points[0]
  const delta = latest && first ? latest.topKg - first.topKg : 0

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">Progress</h1>

      <div className="animate-rise flex gap-2 overflow-x-auto pb-1">
        {exerciseNames.map((name) => (
          <button
            key={name}
            type="button"
            className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
              name === active
                ? "border-volt bg-volt text-carbon"
                : "border-line bg-surface text-dim active:bg-raised"
            }`}
            onClick={() => setSelected(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {latest && (
        <div className="animate-rise stagger-1 grid grid-cols-3 gap-2">
          <Stat label="Top set" value={`${fmtKg(latest.topKg)}kg`} />
          <Stat
            label="Change"
            value={`${delta >= 0 ? "+" : ""}${fmtKg(delta)}kg`}
            accent={delta > 0}
          />
          <Stat label="Sessions" value={String(points.length)} />
        </div>
      )}

      <Chart points={points} />

      {points.length > 0 && (
        <div className="animate-rise stagger-3 border border-line bg-surface">
          {[...points].reverse().slice(0, 10).map((p, i) => (
            <div
              key={`${p.date}-${i}`}
              className="flex items-center justify-between border-b border-line/60 px-4 py-2.5 text-sm last:border-0"
            >
              <span className="text-dim">{fmtDate(p.date)}</span>
              <span className="font-mono text-xs font-bold tabular">
                {fmtKg(p.topKg)}kg top · {fmtKg(p.volume)}kg vol
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-line bg-surface p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-dim">{label}</p>
      <p className={`font-mono text-lg font-bold tabular ${accent ? "text-volt" : ""}`}>{value}</p>
    </div>
  )
}

function Chart({ points }: { points: Point[] }) {
  const W = 340
  const H = 140
  const PAD = 12

  if (points.length < 2) {
    return (
      <div className="animate-rise stagger-2 flex h-36 items-center justify-center border border-line bg-surface text-sm text-dim">
        Two or more sessions needed for a trend line.
      </div>
    )
  }

  const min = Math.min(...points.map((p) => p.topKg))
  const max = Math.max(...points.map((p) => p.topKg))
  const range = max - min || 1
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2)
  const y = (kg: number) => H - PAD - ((kg - min) / range) * (H - PAD * 2)
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.topKg)}`).join(" ")
  const area = `${path} L${x(points.length - 1)},${H - PAD} L${x(0)},${H - PAD} Z`

  return (
    <div className="animate-rise stagger-2 border border-line bg-surface p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <path d={area} fill="var(--color-volt)" opacity="0.08" />
        <path
          d={path}
          fill="none"
          stroke="var(--color-volt)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.topKg)} r="3.5" fill="var(--color-volt)" />
        ))}
      </svg>
      <div className="flex justify-between px-1 font-mono text-[10px] font-bold text-faint">
        <span>{fmtDate(points[0].date)}</span>
        <span>
          {fmtKg(min)}–{fmtKg(max)}kg
        </span>
        <span>{fmtDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  )
}
