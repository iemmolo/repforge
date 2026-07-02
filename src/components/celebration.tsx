import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import type { PR } from "@/lib/gamify";
import { fmtKg } from "@/lib/utils";

interface CelebrationProps {
  workoutName: string;
  prs: PR[];
  onClose: () => void;
}

const COLORS = [
  "#d6fb2e", // volt
  "#ff4757", // red
  "#ffa502", // orange
  "#ffd32a", // yellow
  "#2ed573", // green
  "#1e90ff", // blue
  "#a55eea", // purple
  "#ff6b81", // pink
  "#f2f2ef", // white
];

export function Celebration({ workoutName, prs, onClose }: CelebrationProps) {
  // two volleys launching along the card's top edge (left corner to right
  // corner): left-angled fan first, right-angled fan ~0.25s later
  const pieces = useMemo(
    () =>
      Array.from({ length: 140 }, (_, i) => {
        const right = i >= 70;
        return {
          originX: Math.random() * 100, // % along the card's top border
          dx: (10 + Math.random() * 50) * (right ? 1 : -1), // vw, wide fan
          up: -(14 + Math.random() * 36), // vh
          rot: (360 + Math.random() * 540) * (right ? 1 : -1),
          delay: (right ? 0.25 : 0) + Math.random() * 0.12,
          duration: 2.2 + Math.random() * 1.4,
          size: 5 + Math.random() * 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        };
      }),
    [],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-carbon/45"
      onClick={onClose}
    >
      <div className="relative mx-6 w-full max-w-md">
        {/* pieces sit before the card in paint order, launching from its top
            border — so they emerge from behind the volt frame */}
        {pieces.map((p, i) => (
          <span
            key={i}
            className="pointer-events-none absolute top-0 animate-confetti-x"
            style={
              {
                left: `${p.originX}%`,
                "--dx": `${p.dx}vw`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              } as React.CSSProperties
            }
          >
            <span
              className="block animate-confetti-y"
              style={
                {
                  "--up": `${p.up}vh`,
                  "--rot": `${p.rot}deg`,
                  width: p.size,
                  height: p.size * 0.45,
                  background: p.color,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                } as React.CSSProperties
              }
            />
          </span>
        ))}

        <div className="animate-rise relative border-2 border-volt bg-surface p-6 text-center">
          <div className="mx-auto h-1.5 w-16 hazard" />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-dim">
            {workoutName}
          </p>
          <h2 className="font-display text-4xl text-volt">Workout complete</h2>

          {prs.length > 0 && (
            <div className="mt-4 border border-volt-dim/50 bg-raised/50 p-3 text-left">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-volt">
                <TrendingUp className="h-3.5 w-3.5" />
                {prs.length === 1
                  ? "New personal record"
                  : `${prs.length} new personal records`}
              </p>
              <ul className="mt-2 space-y-1">
                {prs.map((pr) => (
                  <li
                    key={pr.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-semibold">{pr.name}</span>
                    <span className="font-mono text-xs font-bold tabular text-dim">
                      {fmtKg(pr.prevKg)} →{" "}
                      <span className="text-volt">{fmtKg(pr.kg)}kg</span>
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
    </div>
  );
}
