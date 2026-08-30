/**
 * Rest-timer sound. Two separate things break this on iPhone:
 *
 * 1. Safari creates every AudioContext suspended, and only a real user gesture
 *    may start it. The timer fires from an interval — not a gesture — so the
 *    context has to be woken earlier, on the tap that starts the rest.
 * 2. WebAudio is routed to the ringer channel by default, so the hardware mute
 *    switch silences it outright. iOS 16.4+ exposes the Audio Session API,
 *    which can move it to a channel the switch doesn't touch.
 *
 * Neither has a fallback on iOS: Safari implements no `navigator.vibrate`, so
 * if the sound fails there is no cue at all.
 */

interface AudioSessionCapable {
  audioSession?: { type: string }
}

/**
 * The channel for short notification-style sounds: it ducks whatever she's
 * listening to for the length of the ding instead of taking the audio session
 * outright. "playback" also survives the mute switch but pauses her music.
 */
const AUDIO_CHANNEL = "transient"

let ctx: AudioContext | null = null
let warmed = false

function audioContext(): AudioContext | null {
  if (ctx) return ctx
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  try {
    ctx = new Ctx()
  } catch {
    return null
  }
  return ctx
}

function claimChannel() {
  try {
    const session = (navigator as Navigator & AudioSessionCapable).audioSession
    if (session && session.type !== AUDIO_CHANNEL) session.type = AUDIO_CHANNEL
  } catch {
    // pre-16.4 iOS and every other browser — nothing to claim
  }
}

/**
 * Call from a real user gesture. Starting the context on a tap is what buys
 * the right to make noise later, when the rest timer runs out.
 */
export function primeAudio(): void {
  claimChannel()
  const c = audioContext()
  if (!c) return
  void c.resume().catch(() => {})
  if (warmed) return
  warmed = true
  try {
    // one silent sample — the canonical iOS "this context is really awake"
    const source = c.createBufferSource()
    source.buffer = c.createBuffer(1, 1, 22050)
    source.connect(c.destination)
    source.start(0)
  } catch {
    warmed = false
  }
}

function ring(c: AudioContext) {
  const at = c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = "square"
  osc.frequency.value = 880
  gain.gain.setValueAtTime(0.12, at)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5)
  osc.connect(gain).connect(c.destination)
  osc.start(at)
  osc.stop(at + 0.5)
}

export function playChime(): void {
  navigator.vibrate?.([180, 80, 180])
  const c = audioContext()
  if (!c) return
  claimChannel()
  if (c.state === "running") {
    ring(c)
    return
  }
  // a backgrounded tab suspends the context; resuming may or may not be allowed
  c.resume()
    .then(() => ring(c))
    .catch(() => {})
}

/** Returning to the app re-wakes a context iOS suspended while it was hidden. */
export function resumeAudioIfNeeded(): void {
  if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {})
}
