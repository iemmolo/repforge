import { useEffect, useRef, useState } from "react"
import { FastForward, Plus } from "lucide-react"
import { fmtClock } from "@/lib/utils"

export interface RestTimer {
  endsAt: number // epoch ms
  totalSeconds: number
  label: string
}

function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "square"
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    // audio unavailable — vibration below still fires
  }
  navigator.vibrate?.([180, 80, 180])
}

interface RestTimerBarProps {
  timer: RestTimer | null
  onDismiss: () => void
  onExtend: (seconds: number) => void
}

export function RestTimerBar({ timer, onDismiss, onExtend }: RestTimerBarProps) {
  const [now, setNow] = useState(Date.now())
  const firedRef = useRef(false)

  useEffect(() => {
    if (!timer) return
    firedRef.current = false
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [timer])

  useEffect(() => {
    if (timer && now >= timer.endsAt && !firedRef.current) {
      firedRef.current = true
      chime()
    }
  }, [now, timer])

  if (!timer) return null

  const remaining = (timer.endsAt - now) / 1000
  const finished = remaining <= 0
  const progress = Math.max(0, Math.min(1, remaining / timer.totalSeconds))

  return (
    <div className="animate-slide-up fixed inset-x-0 bottom-0 z-40 border-t-2 border-volt bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="h-1.5 w-full bg-raised">
        <div
          className="h-full bg-volt transition-[width] duration-300 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-5 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-dim">
            {finished ? "Go — next set" : "Resting"}
          </p>
          <p className="truncate text-sm font-semibold">{timer.label}</p>
        </div>
        <span
          className={`font-mono text-3xl font-bold tabular ${finished ? "animate-timer-pulse text-volt" : ""}`}
        >
          {fmtClock(remaining)}
        </span>
        <div className="flex gap-2">
          {!finished && (
            <button
              type="button"
              className="flex h-11 items-center gap-1 rounded-lg border border-line px-3 font-mono text-xs font-bold text-dim active:bg-raised"
              onClick={() => onExtend(30)}
            >
              <Plus className="h-3.5 w-3.5" />
              30
            </button>
          )}
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-volt text-carbon active:opacity-80"
            onClick={onDismiss}
            aria-label={finished ? "dismiss timer" : "skip rest"}
          >
            <FastForward className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
