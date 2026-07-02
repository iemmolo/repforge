import { useState } from "react"
import { Check, ChevronDown } from "lucide-react"

export interface PickerOption {
  value: string
  label: string
}

interface PickerProps {
  value: string
  options: PickerOption[]
  onChange: (value: string) => void
  className?: string
}

/** Replacement for native <select>: on-brand bottom-sheet option list. */
export function Picker({ value, options, onChange, className = "" }: PickerProps) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)

  return (
    <>
      <button
        type="button"
        className={`flex h-11 items-center justify-between gap-2 border border-line bg-raised px-3 text-left text-sm outline-none active:border-volt ${className}`}
        onClick={() => setOpen(true)}
      >
        <span className={`truncate ${current?.value === "" ? "text-dim" : ""}`}>
          {current?.label ?? "—"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-faint" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-slide-up mx-auto mb-[calc(env(safe-area-inset-bottom)+16px)] w-[calc(100%-32px)] max-w-md border border-line bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="m-4 mb-0 h-1.5 w-12 hazard" />
            <div className="max-h-[50dvh] overflow-y-auto p-2">
              {options.map((o) => {
                const selected = o.value === value
                return (
                  <button
                    key={o.value}
                    type="button"
                    className={`flex h-12 w-full items-center justify-between px-3 text-left text-sm font-semibold ${
                      selected ? "bg-raised text-volt" : "text-ink active:bg-raised"
                    }`}
                    onClick={() => {
                      onChange(o.value)
                      setOpen(false)
                    }}
                  >
                    {o.label}
                    {selected && <Check className="h-4 w-4" strokeWidth={3} />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
