import { describe, it, expect } from 'vitest';
import {
  angleDeg,
  createPushupState, pushupTick, PU_DOWN_DEG, PU_UP_DEG, PU_FRAMES_STABLE, PU_REFRACTORY_MS,
  createPullupState, pullupTick, PL_BOTTOM_DEG, PL_TOP_DEG, PL_FRAMES_STABLE, PL_REFRACTORY_MS,
  PL_SWING_X_THRESH, PL_KIPPING_Y_THRESH,
} from './lib/core.js';

// ── Landmark helpers ─────────────────────────────────────────────────────────

function lm(x, y, vis = 1.0) { return { x, y, visibility: vis }; }

function blankLms() {
  return Array.from({ length: 33 }, () => lm(0.5, 0.5));
}

/**
 * Build a landmark array with arm landmarks set to a specific angle at the elbow.
 * Uses the left arm (indices 11, 13, 15). Right arm visibility = 0 so left is chosen.
 *
 * geometry verified: angleDeg(sh, el, wr)
 *   pushDownLms  → elbow ≈ 90°  (< PU_DOWN_DEG=95)
 *   pushUpLms    → elbow ≈ 180° (> PU_UP_DEG=155)
 *   pullTopLms   → elbow ≈ 74.7° (< PL_TOP_DEG=75)
 *   pullBotLms   → elbow ≈ 172.9° (> PL_BOTTOM_DEG=145)
 */
function pushDownLms() {
  const lms = blankLms();
  // sh=(0.3,0.3), el=(0.5,0.5), wr=(0.7,0.3) → 90° at elbow
  lms[11] = lm(0.3, 0.3); lms[13] = lm(0.5, 0.5); lms[15] = lm(0.7, 0.3);
  lms[12] = lm(0.5, 0.5, 0); lms[14] = lm(0.5, 0.5, 0); lms[16] = lm(0.5, 0.5, 0);
  return lms;
}

function pushUpLms() {
  const lms = blankLms();
  // sh=(0.3,0.5), el=(0.5,0.5), wr=(0.7,0.5) → 180° at elbow (straight arm)
  lms[11] = lm(0.3, 0.5); lms[13] = lm(0.5, 0.5); lms[15] = lm(0.7, 0.5);
  lms[12] = lm(0.5, 0.5, 0); lms[14] = lm(0.5, 0.5, 0); lms[16] = lm(0.5, 0.5, 0);
  return lms;
}

function pullTopLms(hipX = 0.5) {
  // sh=(0.4,0.5), el=(0.2,0.2), wr=(0.5,0.1) → ~74.7° at elbow
  const lms = blankLms();
  lms[11] = lm(0.4, 0.5); lms[13] = lm(0.2, 0.2); lms[15] = lm(0.5, 0.1);
  lms[12] = lm(0.4, 0.5); lms[14] = lm(0.2, 0.2); lms[16] = lm(0.5, 0.1);
  lms[23] = lm(hipX - 0.1, 0.7); lms[24] = lm(hipX + 0.1, 0.7);
  lms[0]  = lm(0.5, 0.05, 0.9); // nose above bar
  return lms;
}

function pullBotLms(hipX = 0.5) {
  // sh=(0.52,0.7), el=(0.50,0.5), wr=(0.51,0.1) → ~172.9° at elbow
  const lms = blankLms();
  lms[11] = lm(0.52, 0.7); lms[13] = lm(0.50, 0.5); lms[15] = lm(0.51, 0.1);
  lms[12] = lm(0.52, 0.7); lms[14] = lm(0.50, 0.5); lms[16] = lm(0.51, 0.1);
  lms[23] = lm(hipX - 0.1, 0.85); lms[24] = lm(hipX + 0.1, 0.85);
  lms[0]  = lm(0.5, 0.4, 0.9);
  return lms;
}

// Feed N frames of a given landmark set into the tick function
function feedFrames(n, lmsFactory, tickFn, state, now = 1000) {
  let counted = 0;
  for (let i = 0; i < n; i++) {
    if (tickFn(state, lmsFactory(), now + i * 100)) counted++;
  }
  return counted;
}

// ── Geometry sanity ──────────────────────────────────────────────────────────

describe('landmark geometry (sanity)', () => {
  it('pushDownLms elbow angle < PU_DOWN_DEG', () => {
    const lms = pushDownLms();
    expect(angleDeg(lms[11], lms[13], lms[15])).toBeLessThan(PU_DOWN_DEG);
  });
  it('pushUpLms elbow angle > PU_UP_DEG', () => {
    const lms = pushUpLms();
    expect(angleDeg(lms[11], lms[13], lms[15])).toBeGreaterThan(PU_UP_DEG);
  });
  it('pullTopLms elbow angle < PL_TOP_DEG', () => {
    const lms = pullTopLms();
    expect(angleDeg(lms[11], lms[13], lms[15])).toBeLessThan(PL_TOP_DEG);
  });
  it('pullBotLms elbow angle > PL_BOTTOM_DEG', () => {
    const lms = pullBotLms();
    expect(angleDeg(lms[11], lms[13], lms[15])).toBeGreaterThan(PL_BOTTOM_DEG);
  });
});

// ── Push-up counting ─────────────────────────────────────────────────────────

describe('pushupTick', () => {
  it('counts one rep after full down-then-up cycle', () => {
    const s = createPushupState();
    // 3 frames down → phase='down'
    feedFrames(PU_FRAMES_STABLE, pushDownLms, pushupTick, s, 0);
    expect(s.phase).toBe('down');
    // 3 frames up → rep counted
    let reps = 0;
    for (let i = 0; i < PU_FRAMES_STABLE; i++) {
      if (pushupTick(s, pushUpLms(), 2000 + i * 100)) reps++;
    }
    expect(reps).toBe(1);
    expect(s.reps).toBe(1);
    expect(s.phase).toBe('up');
  });

  it('does not count without first going through down phase', () => {
    const s = createPushupState();
    feedFrames(PU_FRAMES_STABLE, pushUpLms, pushupTick, s, 0);
    expect(s.reps).toBe(0); // started at 'ready', never went 'down'
  });

  it('requires PU_FRAMES_STABLE consecutive frames before transitioning', () => {
    const s = createPushupState();
    // Only PU_FRAMES_STABLE-1 frames down — should NOT set phase to 'down'
    feedFrames(PU_FRAMES_STABLE - 1, pushDownLms, pushupTick, s, 0);
    expect(s.phase).toBe('ready');
  });

  it('enforces refractory period — no double count within PU_REFRACTORY_MS', () => {
    const s = createPushupState();
    feedFrames(PU_FRAMES_STABLE, pushDownLms, pushupTick, s, 0);
    // First rep
    feedFrames(PU_FRAMES_STABLE, pushUpLms, pushupTick, s, 2000);
    expect(s.reps).toBe(1);
    // Second down → up immediately (within refractory window)
    feedFrames(PU_FRAMES_STABLE, pushDownLms, pushupTick, s, 2000 + 100);
    const now2 = 2000 + PU_REFRACTORY_MS - 50; // still inside window
    feedFrames(PU_FRAMES_STABLE, pushUpLms, pushupTick, s, now2);
    expect(s.reps).toBe(1); // blocked by refractory
  });

  it('counts a second rep after refractory period expires', () => {
    const s = createPushupState();
    feedFrames(PU_FRAMES_STABLE, pushDownLms, pushupTick, s, 0);
    feedFrames(PU_FRAMES_STABLE, pushUpLms, pushupTick, s, 2000);
    expect(s.reps).toBe(1);
    // Down again
    feedFrames(PU_FRAMES_STABLE, pushDownLms, pushupTick, s, 3000);
    // Up after refractory clears
    feedFrames(PU_FRAMES_STABLE, pushUpLms, pushupTick, s, 3000 + PU_REFRACTORY_MS + 100);
    expect(s.reps).toBe(2);
  });

  it('resets counters after sustained low-visibility frames', () => {
    const s = createPushupState();
    feedFrames(PU_FRAMES_STABLE, pushDownLms, pushupTick, s, 0);
    expect(s.downFrames).toBe(PU_FRAMES_STABLE);
    // 11+ low-visibility frames
    const lowLms = pushDownLms();
    lowLms[11] = lm(0.3, 0.3, 0.1); lowLms[13] = lm(0.5, 0.5, 0.1); lowLms[15] = lm(0.7, 0.3, 0.1);
    for (let i = 0; i < 12; i++) pushupTick(s, lowLms, 5000 + i * 100);
    expect(s.downFrames).toBe(0);
    expect(s.upFrames).toBe(0);
  });

  it('missing required landmarks returns false without throwing', () => {
    const s = createPushupState();
    const sparse = blankLms();
    sparse[11] = undefined;
    expect(() => pushupTick(s, sparse, 0)).not.toThrow();
    expect(pushupTick(s, sparse, 0)).toBe(false);
  });
});

// ── Pull-up counting ─────────────────────────────────────────────────────────

describe('pullupTick', () => {
  it('counts one rep after full top-then-bottom cycle', () => {
    const s = createPullupState();
    feedFrames(PL_FRAMES_STABLE, pullTopLms, pullupTick, s, 0);
    expect(s.phase).toBe('up');
    let reps = 0;
    for (let i = 0; i < PL_FRAMES_STABLE; i++) {
      if (pullupTick(s, pullBotLms(), 2000 + i * 100)) reps++;
    }
    expect(reps).toBe(1);
    expect(s.reps).toBe(1);
    expect(s.phase).toBe('down');
  });

  it('does not count without first reaching top (up) phase', () => {
    const s = createPullupState();
    feedFrames(PL_FRAMES_STABLE, pullBotLms, pullupTick, s, 0);
    expect(s.reps).toBe(0);
    expect(s.phase).toBe('down');
  });

  it('requires PL_FRAMES_STABLE consecutive frames before phase transition', () => {
    const s = createPullupState();
    feedFrames(PL_FRAMES_STABLE - 1, pullTopLms, pullupTick, s, 0);
    expect(s.phase).toBe('ready'); // not enough frames
  });

  it('enforces refractory period', () => {
    const s = createPullupState();
    feedFrames(PL_FRAMES_STABLE, pullTopLms, pullupTick, s, 0);
    feedFrames(PL_FRAMES_STABLE, pullBotLms, pullupTick, s, 2000);
    expect(s.reps).toBe(1);
    feedFrames(PL_FRAMES_STABLE, pullTopLms, pullupTick, s, 2200);
    const insideRefrac = 2000 + PL_REFRACTORY_MS - 50;
    feedFrames(PL_FRAMES_STABLE, pullBotLms, pullupTick, s, insideRefrac);
    expect(s.reps).toBe(1); // blocked
  });

  it('blocks rep when hips are swinging laterally', () => {
    const s = createPullupState();
    // Establish hip reference at bottom position (hipX=0.5)
    feedFrames(PL_FRAMES_STABLE, pullBotLms, pullupTick, s, 0);
    expect(s.hipXRef).toBeCloseTo(0.5, 1);
    // Go to top
    feedFrames(PL_FRAMES_STABLE, pullTopLms, pullupTick, s, 1000);
    expect(s.phase).toBe('up');
    // Come down with large lateral hip drift (hipX=0.85, drift=0.35 from ref=0.5).
    // EMA shifts ref by ~0.25 weight per frame so after 3 frames drift stays ≈0.15 > 0.10.
    feedFrames(PL_FRAMES_STABLE, () => pullBotLms(0.85), pullupTick, s, 3000);
    expect(s.isSwinging).toBe(true);
    expect(s.reps).toBe(0); // blocked by swing detection
  });

  it('blocks rep when hips kip (rise above reference)', () => {
    const s = createPullupState();
    // Establish hip reference at bottom — pullBotLms sets hipY≈0.85 (large y = low in frame)
    feedFrames(PL_FRAMES_STABLE, () => pullBotLms(0.5), pullupTick, s, 0);
    expect(s.hipYRef).toBeCloseTo(0.85, 1);
    // Top phase
    feedFrames(PL_FRAMES_STABLE, () => pullTopLms(0.5), pullupTick, s, 1000);
    expect(s.phase).toBe('up');
    // Kipping bottom: hips surge to y=0.55 (rise of 0.30 from ref≈0.85).
    // After 3 EMA frames the rise stays ≈0.13 > PL_KIPPING_Y_THRESH=0.08.
    const kippingBotLms = () => {
      const lms = pullBotLms(0.5);
      lms[23] = lm(0.4, 0.55);
      lms[24] = lm(0.6, 0.55);
      return lms;
    };
    feedFrames(PL_FRAMES_STABLE, kippingBotLms, pullupTick, s, 3000);
    expect(s.isSwinging).toBe(true);
    expect(s.reps).toBe(0);
  });

  it('counts rep when hips are stable', () => {
    const s = createPullupState();
    feedFrames(PL_FRAMES_STABLE, pullTopLms, pullupTick, s, 0);
    feedFrames(PL_FRAMES_STABLE, pullBotLms, pullupTick, s, 2000);
    expect(s.isSwinging).toBe(false);
    expect(s.reps).toBe(1);
  });

  it('counts multiple reps in sequence', () => {
    const s = createPullupState();
    let t = 0;
    for (let rep = 0; rep < 3; rep++) {
      feedFrames(PL_FRAMES_STABLE, pullTopLms, pullupTick, s, t); t += 1000;
      feedFrames(PL_FRAMES_STABLE, pullBotLms, pullupTick, s, t); t += PL_REFRACTORY_MS + 200;
    }
    expect(s.reps).toBe(3);
  });

  it('returns false and does not throw for sparse landmarks', () => {
    const s = createPullupState();
    const sparse = blankLms();
    sparse[11] = undefined;
    expect(() => pullupTick(s, sparse, 0)).not.toThrow();
    expect(pullupTick(s, sparse, 0)).toBe(false);
  });
});
