let _ctx = null

function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

function tone(freq, dur, type = 'sine', vol = 0.18) {
  try {
    const ctx  = getCtx()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(vol, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    osc.start()
    osc.stop(ctx.currentTime + dur)
  } catch {}
}

export function hapticRep() {
  navigator.vibrate?.(18)
  tone(680, 0.07, 'square', 0.1)
}

export function hapticMilestone() {
  navigator.vibrate?.([25, 12, 40])
  tone(440, 0.1, 'sine', 0.14)
  setTimeout(() => tone(660, 0.18, 'sine', 0.17), 110)
}

export function hapticGoal() {
  navigator.vibrate?.([40, 20, 70, 20, 100])
  tone(523, 0.25, 'sine', 0.2)
  setTimeout(() => tone(659, 0.30, 'sine', 0.2), 90)
  setTimeout(() => tone(784, 0.42, 'sine', 0.2), 180)
}
