import { useState } from "react"
import {
  Check,
  CheckCircle2,
  Download,
  Info,
  Keyboard,
  Timer,
  TrendingUp,
  X,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { PRESET_BY_ID } from "@/lib/seed"
import { CATEGORY_LABELS } from "@/lib/utils"

const TIPS = [
  {
    icon: CheckCircle2,
    title: "Log by exception",
    body: "Sets come pre-filled at your targets. Hit them? Just tap the check. Only edit what actually differed.",
  },
  {
    icon: Keyboard,
    title: "Type exact numbers",
    body: "Every stepper: tap the number itself to type a precise value instead of tapping +/−.",
  },
  {
    icon: TrendingUp,
    title: "Progression is automatic",
    body: "Hit every set at target and the next weight is suggested on Today. Miss three sessions in a row and a deload is suggested instead.",
  },
  {
    icon: Timer,
    title: "Rest timer",
    body: "Checking a set off starts that exercise's rest countdown automatically.",
  },
  {
    icon: Info,
    title: "Mid-workout intel",
    body: "During a session, tap an exercise's name to see what you lifted last time and the plate breakdown.",
  },
  {
    icon: Download,
    title: "Back up your data",
    body: "Everything lives in this browser — no account, no cloud. Export a backup from the Programs tab now and then.",
  },
]

function TipList() {
  return (
    <ul className="space-y-4">
      {TIPS.map(({ icon: Icon, title, body }, i) => (
        <li key={title} className="animate-rise flex gap-3" style={{ animationDelay: `${i * 60}ms` }}>
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-volt" />
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-dim">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Slide-up sheet with the how-it-works tips, reachable from the header. */
export function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-slide-up mx-auto mb-[calc(env(safe-area-inset-bottom)+16px)] max-h-[85dvh] w-[calc(100%-32px)] max-w-md overflow-y-auto border border-line bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-3 h-1.5 w-12 hazard" />
            <h2 className="font-display text-xl">How Repforge works</h2>
          </div>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center border border-line text-dim active:bg-raised"
            onClick={onClose}
            aria-label="close help"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4">
          <TipList />
        </div>
      </div>
    </div>
  )
}

/** Full-screen first-run flow: welcome → pick a program → how it works. */
export function Onboarding() {
  const { state, dispatch } = useStore()
  const [step, setStep] = useState(0)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-carbon">
      <div className="mx-auto flex min-h-full max-w-md flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+40px)]">
        {step === 0 && (
          <div className="flex flex-1 flex-col justify-center">
            <div className="animate-rise h-2 w-24 hazard" />
            <h1 className="animate-rise stagger-1 mt-6 font-display text-6xl leading-none">
              REP<span className="text-volt">FORGE</span>
            </h1>
            <p className="animate-rise stagger-2 mt-4 text-lg text-dim">
              Pick a workout program or create your own.
            </p>
            <p className="animate-rise stagger-3 mt-2 text-sm text-faint">
              Built out of frustration at gym apps.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-volt">
              Step 1 of 2
            </p>
            <h1 className="font-display mt-1 text-3xl">Pick your program</h1>
            <p className="mt-1 text-sm text-dim">
              You can switch, edit, or build your own later in the Programs tab.
            </p>
            <div className="mt-4 space-y-2">
              {state.programs.map((p) => {
                const active = p.id === state.activeProgramId
                const days =
                  p.scheduleMode === "cycle"
                    ? `${p.daysPerWeek ?? 3} days/week`
                    : `${Object.keys(p.schedule).length} days/week`
                const cat = p.category ?? PRESET_BY_ID.get(p.id)?.category
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`w-full border px-4 py-3 text-left ${
                      active ? "border-volt bg-surface" : "border-line bg-surface active:bg-raised"
                    }`}
                    onClick={() => dispatch({ type: "selectProgram", programId: p.id })}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-display truncate text-lg ${active ? "text-volt" : ""}`}>
                        {p.name}
                      </span>
                      {active && <Check className="h-5 w-5 shrink-0 text-volt" strokeWidth={3} />}
                    </div>
                    <p className="mt-0.5 text-sm text-dim">{p.tagline}</p>
                    <p className="mt-1 font-mono text-[11px] font-bold uppercase text-faint">
                      {days}
                      {cat ? ` · ${CATEGORY_LABELS[cat]}` : ""}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-volt">
              Step 2 of 2
            </p>
            <h1 className="font-display mt-1 text-3xl">How it works</h1>
            <p className="mt-1 mb-5 text-sm text-dim">
              Thirty seconds now saves fumbling at the squat rack later.
            </p>
            <TipList />
          </div>
        )}

        <div className="mt-8 flex gap-2">
          {step > 0 && (
            <button
              type="button"
              className="h-14 flex-1 border border-line font-semibold uppercase tracking-wide text-dim active:bg-raised"
              onClick={() => setStep(step - 1)}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className="h-14 flex-[2] bg-volt font-display text-lg text-carbon active:opacity-90"
            onClick={() =>
              step < 2 ? setStep(step + 1) : dispatch({ type: "completeOnboarding" })
            }
          >
            {step === 0 ? "Get started" : step === 1 ? "Continue" : "Start training"}
          </button>
        </div>
      </div>
    </div>
  )
}
