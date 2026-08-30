import { describe, it, expect } from 'vitest'
import { analyzeTeep, analyzeHeadMovement } from '../services/poseService'

// ── Helpers ──────────────────────────────────────────────────────────

// Build a minimal 33-landmark array (MediaPipe pose).
// Only indices 23 (lHip), 24 (rHip), 27 (lAnkle), 28 (rAnkle), 0 (nose) are used.
function makeLm({ lHipY = 0.6, rHipY = 0.6, lAnkleY = 0.9, rAnkleY = 0.9, vis = 0.9, noseX = 0.5, noseVis = 0.9 } = {}) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: vis }))
  lm[0]  = { x: noseX, y: 0.2, visibility: noseVis }   // nose
  lm[23] = { x: 0.45, y: lHipY,   visibility: vis }    // left hip
  lm[24] = { x: 0.55, y: rHipY,   visibility: vis }    // right hip
  lm[27] = { x: 0.45, y: lAnkleY, visibility: vis }    // left ankle
  lm[28] = { x: 0.55, y: rAnkleY, visibility: vis }    // right ankle
  return lm
}

// ── analyzeTeep ──────────────────────────────────────────────────────

describe('analyzeTeep', () => {
  it('neutral position — ankle below hip — does not raise or count', () => {
    // ankle y > hip y in normalized coords (y increases downward)
    const lm = makeLm({ lHipY: 0.55, lAnkleY: 0.90 })
    const result = analyzeTeep(lm, {})
    expect(result.raised).toBe(false)
    expect(result.count).toBe(0)
    expect(result.newTeep).toBe(false)
  })

  it('ankle above hip by more than threshold — raised is true', () => {
    // ankle y < hip y - 0.08  →  raised
    const lm = makeLm({ lHipY: 0.60, lAnkleY: 0.50 })  // 0.50 < 0.60 - 0.08 = 0.52 ✓
    const result = analyzeTeep(lm, {})
    expect(result.raised).toBe(true)
    expect(result.newTeep).toBe(false)  // falling edge not yet
    expect(result.count).toBe(0)
  })

  it('leg returns to neutral after raised — count increments exactly once', () => {
    const lm = makeLm({ lHipY: 0.60, lAnkleY: 0.50 })   // raised
    const raised = analyzeTeep(lm, {})
    expect(raised.raised).toBe(true)

    const lmNeutral = makeLm({ lHipY: 0.60, lAnkleY: 0.90 })  // back to neutral
    const returned = analyzeTeep(lmNeutral, raised)
    expect(returned.raised).toBe(false)
    expect(returned.newTeep).toBe(true)
    expect(returned.count).toBe(1)
  })

  it('staying neutral frame after frame does not keep incrementing', () => {
    const lm = makeLm()  // ankle at 0.9, hip at 0.6 — clearly neutral
    let state = analyzeTeep(lm, {})
    state = analyzeTeep(lm, state)
    state = analyzeTeep(lm, state)
    expect(state.count).toBe(0)
  })

  it('right leg raised works symmetrically', () => {
    const lm = makeLm({ rHipY: 0.60, rAnkleY: 0.45 })   // right ankle well above right hip
    const result = analyzeTeep(lm, {})
    expect(result.raised).toBe(true)
  })

  it('low-visibility landmarks — not detected as raised', () => {
    // visibility < 0.35 threshold → v() check fails
    const lm = makeLm({ lHipY: 0.60, lAnkleY: 0.50, vis: 0.2 })
    const result = analyzeTeep(lm, {})
    expect(result.raised).toBe(false)
    expect(result.count).toBe(0)
  })

  it('missing landmark slot — does not throw', () => {
    const lm = makeLm()
    lm[27] = undefined   // left ankle missing
    expect(() => analyzeTeep(lm, {})).not.toThrow()
  })
})

// ── analyzeHeadMovement ──────────────────────────────────────────────

describe('analyzeHeadMovement', () => {
  it('missing nose landmark — returns safe default without throwing', () => {
    const lm = makeLm()
    lm[0] = undefined
    const result = analyzeHeadMovement(lm, [])
    expect(result.insufficient).toBe(false)
    expect(result.range).toBe(0)
    expect(Array.isArray(result.noseHistory)).toBe(true)
  })

  it('low-visibility nose — returns safe default', () => {
    const lm = makeLm({ noseVis: 0.1 })
    const result = analyzeHeadMovement(lm, [])
    expect(result.insufficient).toBe(false)
    expect(result.range).toBe(0)
  })

  it('short history (≤ 8 frames) — insufficient is false regardless of movement', () => {
    const lm = makeLm({ noseX: 0.5 })
    // Build a 5-frame history of a perfectly stationary nose
    const history = [0.5, 0.5, 0.5, 0.5, 0.5]
    const result = analyzeHeadMovement(lm, history)
    // range = 1 (not-enough-data sentinel) → insufficient false
    expect(result.insufficient).toBe(false)
    expect(result.noseHistory.length).toBe(6)
  })

  it('stationary head over 9+ frames — detected as insufficient', () => {
    // 9 identical x values → range ≈ 0 < 0.04 → insufficient
    const lm = makeLm({ noseX: 0.5 })
    const history = Array(9).fill(0.5)
    const result = analyzeHeadMovement(lm, history)
    expect(result.range).toBeLessThan(0.04)
    expect(result.insufficient).toBe(true)
  })

  it('meaningful lateral movement — not marked insufficient', () => {
    // span of 0.1 (10% frame width) well above 0.04 threshold
    const lm = makeLm({ noseX: 0.55 })
    const history = [0.45, 0.46, 0.47, 0.48, 0.50, 0.51, 0.52, 0.53, 0.54]
    const result = analyzeHeadMovement(lm, history)
    expect(result.range).toBeGreaterThanOrEqual(0.04)
    expect(result.insufficient).toBe(false)
  })

  it('history is capped at 30 frames', () => {
    const lm = makeLm({ noseX: 0.5 })
    const longHistory = Array(30).fill(0.5)
    const result = analyzeHeadMovement(lm, longHistory)
    // slice(-30) on 31 items = 30
    expect(result.noseHistory.length).toBe(30)
  })

  it('returned noseHistory contains the new nose.x value', () => {
    const lm = makeLm({ noseX: 0.42 })
    const result = analyzeHeadMovement(lm, [0.5, 0.5, 0.5])
    expect(result.noseHistory.at(-1)).toBeCloseTo(0.42)
  })
})
