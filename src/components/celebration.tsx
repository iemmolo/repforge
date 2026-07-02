import { useMemo } from "react"
import { TrendingUp } from "lucide-react"
import type { PR } from "@/lib/gamify"
import { fmtKg } from "@/lib/utils"

interface CelebrationProps {
  workoutName: string
  prs: PR[]
  onClose: () => void
}

const COLORS = ["#d6fb2e", "#f2f2ef", "#9db81f"]

export function Celebration({ workoutName, prs, onClose }: CelebrationProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 2.2 + Math.random() * 2,
        size: 5 + Math.random() * 8,
        color: COLORS[i % COLORS.length],
      })),
    [],
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-carbon/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="pointer-events-none absolute top-0 animate-confetti"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.45,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      <div className="animate-rise mx-6 w-full max-w-md border-2 border-volt bg-surface p-6 text-center">
        <div className="mx-auto h-1.5 w-16 hazard" />
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-dim">
          {workoutName}
        </p>
        <h2 className="font-display text-4xl text-volt">Workout complete</h2>

        {prs.length > 0 && (
          <div className="mt-4 border border-volt-dim/50 bg-raised/50 p-3 text-left">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-volt">
              <TrendingUp className="h-3.5 w-3.5" />
              {prs.length === 1 ? "New personal record" : `${prs.length} new personal records`}
            </p>
            <ul className="mt-2 space-y-1">
              {prs.map((pr) => (
                <li key={pr.name} className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{pr.name}</span>
                  <span className="font-mono text-xs font-bold tabular text-dim">
                    {fmtKg(pr.prevKg)} → <span className="text-volt">{fmtKg(pr.kg)}kg</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          className="mt-5 h-12 w-full bg-volt font-display text-lg text-carbon active:opacity-90"
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  )
}
