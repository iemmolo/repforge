import { useMemo, useState } from "react"
import { Award, Dumbbell, Flame, Footprints, TrendingUp, Weight } from "lucide-react"
import { useActiveProgram, useStore } from "@/lib/store"
import { badges, heatmap, weeklyStreak, type BadgeKind } from "@/lib/gamify"
import { fmtDate, fmtKg } from "@/lib/utils"

interface Point {
  date: string
  topKg: number
  volume: number
}

export default function ProgressPage() {
  const { state } = useStore()
  const program = useActiveProgram()

  const weekTarget =
    program.scheduleMode === "cycle"
      ? (program.daysPerWeek ?? 3)
      : Object.keys(program.schedule).length || 3
  const streak = weeklyStreak(state.logs, weekTarget)
  const grid = useMemo(() => heatmap(state.logs), [state.logs])
  const badgeList = useMemo(() => badges(state.logs, streak.weeks), [state.logs, streak.weeks])
  const earned = badgeList.filter((b) => b.earned).length

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">Progress</h1>

      {/* Consistency */}
      <div className="animate-rise border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-dim">Consistency</p>
          <p className="font-mono text-xs font-bold tabular text-dim">
            this week {streak.thisWeekCount}/{weekTarget}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Flame
            className={`h-10 w-10 ${streak.weeks > 0 ? "text-volt" : "text-faint"}`}
            fill={streak.weeks > 0 ? "currentColor" : "none"}
          />
          <div>
            <p className="font-mono text-3xl font-bold tabular leading-none">
              {streak.weeks}
              <span className="ml-1 text-sm text-dim">wk</span>
            </p>
            <p className="text-xs text-dim">
              {streak.weeks === 0
                ? `Hit ${weekTarget} sessions this week to light the flame`
                : streak.thisWeekHit
                  ? "Week complete — streak safe"
                  : `${weekTarget - streak.thisWeekCount} more this week to keep it alive`}
            </p>
          </div>
        </div>

        {/* heatmap: 16 weeks, Mon–Sun rows */}
        <div className="mt-4 flex gap-[3px]">
          {grid.map((week, wi) => (
            <div key={wi} className="flex min-w-0 flex-1 flex-col gap-[3px]">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={day.date}
                  className={`aspect-square w-full rounded-[2px] ${
                    day.level === 2
                      ? "bg-volt"
                      : day.level === 1
                        ? "bg-volt-dim/50"
                        : day.level === 0
                          ? "bg-raised"
                          : "bg-transparent"
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10px] font-bold text-faint">
          <span>{fmtDate(grid[0][0].date)}</span>
          <span>today</span>
        </div>
      </div>

      <LiftCharts />

      {/* Badges */}
      <div className="animate-rise stagger-2 border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-dim">Badges</p>
          <p className="font-mono text-xs font-bold tabular text-dim">
            {earned}/{badgeList.length}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {badgeList.map((b) => (
            <div
              key={b.id}
              title={b.desc}
              className={`flex flex-col items-center gap-1 border p-2 text-center ${
                b.earned ? "border-volt-dim/60 bg-raised/60" : "border-line/60 opacity-40"
              }`}
            >
              <BadgeIcon kind={b.kind} earned={b.earned} />
              <p className="text-[9px] font-semibold uppercase leading-tight tracking-wide">
                {b.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BadgeIcon({ kind, earned }: { kind: BadgeKind; earned: boolean }) {
  const cls = `h-5 w-5 ${earned ? "text-volt" : "text-faint"}`
  switch (kind) {
    case "sessions":
      return <Dumbbell className={cls} />
    case "streak":
      return <Flame className={cls} />
    case "pr":
      return <Award className={cls} />
    case "cardio":
      return <Footprints className={cls} />
    case "volume":
      return <Weight className={cls} />
  }
}

function LiftCharts() {
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
      <div className="animate-rise stagger-1 flex items-center gap-2 border border-line bg-surface p-4 text-sm text-dim">
        <TrendingUp className="h-4 w-4 shrink-0" />
        Log a few workouts and your lifts will graph here.
      </div>
    )
  }

  const latest = points[points.length - 1]
  const first = points[0]
  const delta = latest && first ? latest.topKg - first.topKg : 0

  return (
    <div className="animate-rise stagger-1 space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
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
        <div className="grid grid-cols-3 gap-2">
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
      <div className="flex h-36 items-center justify-center border border-line bg-surface text-sm text-dim">
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
    <div className="border border-line bg-surface p-3">
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
