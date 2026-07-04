interface ConfirmProps {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  /** "danger" (default) for destructive actions, "accent" for positive ones */
  tone?: "danger" | "accent"
  onConfirm: () => void
  onClose: () => void
}

export function Confirm({ open, title, body, confirmLabel = "Confirm", tone = "danger", onConfirm, onClose }: ConfirmProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="animate-slide-up mx-auto mb-[calc(env(safe-area-inset-bottom)+16px)] w-[calc(100%-32px)] max-w-md border border-line bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 h-1.5 w-12 hazard" />
        <h2 className="font-display text-xl">{title}</h2>
        <p className="mt-1 text-sm text-dim">{body}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            className="h-12 flex-1 rounded-lg border border-line font-semibold uppercase tracking-wide text-dim active:bg-raised"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`h-12 flex-1 rounded-lg font-semibold uppercase tracking-wide text-carbon active:opacity-80 ${
              tone === "accent" ? "bg-volt" : "bg-danger"
            }`}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
