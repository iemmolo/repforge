import { Minus, Plus } from "lucide-react"

interface StepperProps {
  value: number
  step: number
  min?: number
  suffix?: string
  className?: string
  onChange: (value: number) => void
}

/** Big-thumb numeric stepper. Flexible width so rows never overflow. */
export function Stepper({ value, step, min = 0, suffix, className = "", onChange }: StepperProps) {
  const bump = (dir: 1 | -1) => {
    // round to avoid float drift on 2.5/0.5 steps
    const next = Math.round((value + dir * step) * 100) / 100
    onChange(Math.max(min, next))
  }

  return (
    <div
      className={`flex items-center justify-between overflow-hidden rounded-lg border border-line bg-raised ${className}`}
    >
      <button
        type="button"
        className="flex h-11 w-8 shrink-0 items-center justify-center text-dim active:bg-line active:text-ink"
        onClick={() => bump(-1)}
        aria-label="decrease"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-0 flex-1 truncate px-0.5 text-center font-mono text-sm font-bold tabular">
        {value % 1 === 0 ? value : value.toFixed(1)}
        {suffix && <span className="ml-0.5 text-[10px] font-medium text-dim">{suffix}</span>}
      </span>
      <button
        type="button"
        className="flex h-11 w-8 shrink-0 items-center justify-center text-dim active:bg-line active:text-ink"
        onClick={() => bump(1)}
        aria-label="increase"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
