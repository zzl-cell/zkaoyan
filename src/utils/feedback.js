/**
 * Feedback utilities: sound + vibration for exam answers
 * Uses Web Audio API for instant playback (no file loading delay)
 */

let audioCtx = null

function getAudioContext() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    } catch {
      return null
    }
  }
  // Resume if suspended (required on iOS/Android after user gesture)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

/**
 * Play a correct answer chime (rising two-tone)
 */
export function playCorrectSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime

  // First tone: C5 (523Hz)
  const osc1 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  osc1.type = 'sine'
  osc1.frequency.value = 523
  gain1.gain.setValueAtTime(0.3, now)
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
  osc1.connect(gain1)
  gain1.connect(ctx.destination)
  osc1.start(now)
  osc1.stop(now + 0.15)

  // Second tone: E5 (659Hz) — rising = correct feel
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.type = 'sine'
  osc2.frequency.value = 659
  gain2.gain.setValueAtTime(0.3, now + 0.1)
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
  osc2.connect(gain2)
  gain2.connect(ctx.destination)
  osc2.start(now + 0.1)
  osc2.stop(now + 0.3)
}

/**
 * Play a wrong answer buzz (low descending tone)
 */
export function playWrongSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(300, now)
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.25)
  gain.gain.setValueAtTime(0.2, now)
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.25)
}

/**
 * Vibrate the device (if supported)
 * @param {number} ms - Duration in milliseconds
 */
export function vibrate(ms = 15) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms)
  } catch {}
}

/**
 * Combined feedback: sound + vibration
 * @param {'correct'|'wrong'} type
 */
export function playFeedback(type) {
  if (type === 'correct') {
    playCorrectSound()
    vibrate(30)
  } else {
    playWrongSound()
    vibrate(80)
  }
}
