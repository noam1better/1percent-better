/**
 * Pure utility functions extracted from index.html for unit testing.
 * These mirror the production implementations exactly — no DOM, no globals.
 */

// ── angleDeg ─────────────────────────────────────────────────────────────────
export function angleDeg(a, b, c) {
  const abx = a.x - b.x, aby = a.y - b.y;
  const cbx = c.x - b.x, cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / mag));
  return Math.acos(cos) * 180 / Math.PI;
}

// ── Push-up state machine ─────────────────────────────────────────────────────
export const PU_DOWN_DEG     = 95;
export const PU_UP_DEG       = 155;
export const PU_FRAMES_STABLE = 3;
export const PU_REFRACTORY_MS = 500;

export function createPushupState() {
  return {
    phase:        'ready',
    downFrames:   0,
    upFrames:     0,
    lowVisFrames: 0,
    reps:         0,
    lastCountAt:  0,
  };
}

/**
 * Pure pushup tick — identical logic to pushupTick() in index.html but
 * operates on an explicit state object instead of the _pose global.
 * Returns true if a rep was counted this frame.
 */
export function pushupTick(s, lms, now) {
  const lS = lms[11], rS = lms[12];
  const lE = lms[13], rE = lms[14];
  const lW = lms[15], rW = lms[16];
  if (!lS || !rS || !lE || !rE || !lW || !rW) return false;

  const lVis = (lS.visibility + lE.visibility + lW.visibility) / 3;
  const rVis = (rS.visibility + rE.visibility + rW.visibility) / 3;
  const use  = lVis >= rVis ? [lS, lE, lW] : [rS, rE, rW];

  if (Math.min(use[0].visibility, use[1].visibility, use[2].visibility) < 0.5) {
    s.lowVisFrames++;
    if (s.lowVisFrames > 10) {
      s.downFrames = 0; s.upFrames = 0; s.lowVisFrames = 0;
    }
    return false;
  }
  s.lowVisFrames = 0;

  const elbow = angleDeg(use[0], use[1], use[2]);

  if (elbow < PU_DOWN_DEG) {
    s.downFrames++;
    s.upFrames = 0;
    if (s.downFrames >= PU_FRAMES_STABLE) { s.phase = 'down'; }
  } else if (elbow > PU_UP_DEG) {
    s.upFrames++;
    s.downFrames = 0;
    if (s.upFrames >= PU_FRAMES_STABLE) {
      if (s.phase === 'down' && now - s.lastCountAt > PU_REFRACTORY_MS) {
        s.reps++;
        s.lastCountAt = now;
        s.phase = 'up';
        return true;
      }
      s.phase = 'up';
    }
  } else {
    s.downFrames = Math.max(0, s.downFrames - 1);
    s.upFrames   = Math.max(0, s.upFrames   - 1);
  }
  return false;
}

// ── Pull-up state machine ─────────────────────────────────────────────────────
export const PL_BOTTOM_DEG      = 145;
export const PL_TOP_DEG         = 75;
export const PL_TOP_Y_OFFSET    = 0.04;
export const PL_FRAMES_STABLE   = 3;
export const PL_REFRACTORY_MS   = 700;
export const PL_SWING_X_THRESH  = 0.10;
export const PL_KIPPING_Y_THRESH = 0.08;

export function createPullupState() {
  return {
    phase:        'ready',
    downFrames:   0,
    upFrames:     0,
    lowVisFrames: 0,
    reps:         0,
    lastCountAt:  0,
    hipXRef:      null,
    hipYRef:      null,
    isSwinging:   false,
  };
}

/**
 * Pure pullup tick — identical logic to pullupTick() in index.html.
 * Returns true if a rep was counted this frame.
 */
export function pullupTick(s, lms, now) {
  const lS   = lms[11], rS   = lms[12];
  const lE   = lms[13], rE   = lms[14];
  const lW   = lms[15], rW   = lms[16];
  const lHip = lms[23], rHip = lms[24];
  const nose = lms[0];
  if (!lS || !rS || !lE || !rE || !lW || !rW) return false;

  const lVis = (lS.visibility + lE.visibility + lW.visibility) / 3;
  const rVis = (rS.visibility + rE.visibility + rW.visibility) / 3;
  const use  = lVis >= rVis ? { sh: lS, el: lE, wr: lW } : { sh: rS, el: rE, wr: rW };
  const { sh, el, wr } = use;

  if (Math.min(sh.visibility, el.visibility, wr.visibility) < 0.5) {
    s.lowVisFrames++;
    if (s.lowVisFrames > 10) {
      s.downFrames = 0; s.upFrames = 0; s.lowVisFrames = 0;
    }
    return false;
  }
  s.lowVisFrames = 0;

  const elbow = angleDeg(sh, el, wr);
  const avgWristY = (lW.y + rW.y) / 2;
  const chinAboveBar = nose && nose.visibility > 0.4 &&
                       nose.y <= avgWristY + PL_TOP_Y_OFFSET;
  const atTop    = elbow < PL_TOP_DEG || chinAboveBar;
  const atBottom = elbow > PL_BOTTOM_DEG;

  const hipsOk = lHip && rHip && lHip.visibility > 0.3 && rHip.visibility > 0.3;
  if (hipsOk) {
    const hipX = (lHip.x + rHip.x) / 2;
    const hipY = (lHip.y + rHip.y) / 2;
    if (atBottom) {
      s.hipXRef = s.hipXRef === null ? hipX : s.hipXRef * 0.75 + hipX * 0.25;
      s.hipYRef = s.hipYRef === null ? hipY : s.hipYRef * 0.75 + hipY * 0.25;
    }
    if (s.hipXRef !== null) {
      const driftX      = Math.abs(hipX - s.hipXRef);
      const kippingRise = s.hipYRef !== null ? (s.hipYRef - hipY) : 0;
      s.isSwinging      = driftX > PL_SWING_X_THRESH || kippingRise > PL_KIPPING_Y_THRESH;
    }
  }

  if (atTop) {
    s.upFrames++;
    s.downFrames = 0;
    if (s.upFrames >= PL_FRAMES_STABLE) { s.phase = 'up'; }
  } else if (atBottom) {
    s.downFrames++;
    s.upFrames = 0;
    if (s.downFrames >= PL_FRAMES_STABLE) {
      if (s.phase === 'up' && now - s.lastCountAt > PL_REFRACTORY_MS && !s.isSwinging) {
        s.reps++;
        s.lastCountAt = now;
        s.phase = 'down';
        return true;
      }
      s.phase = 'down';
    }
  } else {
    s.downFrames = Math.max(0, s.downFrames - 1);
    s.upFrames   = Math.max(0, s.upFrames   - 1);
  }
  return false;
}
