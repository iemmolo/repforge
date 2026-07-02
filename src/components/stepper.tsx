import { useRef, useState } from "react"
import { Minus, Plus } from "lucide-react"

interface StepperProps {
  value: number
  step: number
  min?: number
  suffix?: string
  className?: string
  onChange: (value: number) => void
}

/**
 * Big-thumb numeric stepper. Flexible width so rows never overflow.
 * Tap the number itself to type an exact value.
 */
export function Stepper({ value, step, min = 0, suffix, className = "", onChange }: StepperProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const bump = (dir: 1 | -1) => {
    // round to avoid float drift on 2.5/0.5 steps
    const next = Math.round((value + dir * step) * 100) / 100
    onChange(Math.max(min, next))
  }

  function commit() {
    if (draft !== null) {
      const parsed = parseFloat(draft.replace(",", "."))
      if (!Number.isNaN(parsed)) onChange(Math.max(min, Math.round(parsed * 100) / 100))
    }
    setDraft(null)
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
      {draft !== null ? (
        <input
          ref={inputRef}
          className="h-11 min-w-0 flex-1 bg-transparent text-center font-mono text-sm font-bold tabular outline-none"
          inputMode="decimal"
          autoFocus
          value={draft}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") inputRef.current?.blur()
            if (e.key === "Escape") setDraft(null)
          }}
        />
      ) : (
        <button
          type="button"
          className="h-11 min-w-0 flex-1 truncate px-0.5 text-center font-mono text-sm font-bold tabular"
          onClick={() => setDraft(String(value))}
          aria-label="type exact value"
        >
          {Number(value.toFixed(2))}
          {suffix && <span className="ml-0.5 text-[10px] font-medium text-dim">{suffix}</span>}
        </button>
      )}
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
