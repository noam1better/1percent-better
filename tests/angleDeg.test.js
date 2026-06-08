import { describe, it, expect } from 'vitest';
import { angleDeg } from './lib/core.js';

const p = (x, y) => ({ x, y, visibility: 1.0 });

describe('angleDeg', () => {
  it('returns 90° for a right angle', () => {
    // b at origin, a pointing right, c pointing up
    const a = p(1, 0), b = p(0, 0), c = p(0, 1);
    expect(angleDeg(a, b, c)).toBeCloseTo(90, 1);
  });

  it('returns 180° for collinear points (straight line)', () => {
    const a = p(0, 0), b = p(1, 0), c = p(2, 0);
    expect(angleDeg(a, b, c)).toBeCloseTo(180, 1);
  });

  it('returns 0° when a and c are on the same ray from b', () => {
    // a and c coincide → angle collapses to 0
    const a = p(2, 0), b = p(0, 0), c = p(2, 0);
    expect(angleDeg(a, b, c)).toBeCloseTo(0, 1);
  });

  it('returns 45° for a diagonal angle', () => {
    // a=(1,0), b=(0,0), c=(1,1) → angle = 45°
    const a = p(1, 0), b = p(0, 0), c = p(1, 1);
    expect(angleDeg(a, b, c)).toBeCloseTo(45, 0);
  });

  it('returns 0 when magnitude is zero (degenerate point)', () => {
    const a = p(0, 0), b = p(0, 0), c = p(1, 1);
    expect(angleDeg(a, b, c)).toBe(0);
  });

  it('clamps to [0, 180] — never returns NaN', () => {
    const a = p(0.000001, 0), b = p(0, 0), c = p(-0.000001, 0);
    const angle = angleDeg(a, b, c);
    expect(angle).not.toBeNaN();
    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThanOrEqual(180);
  });

  it('is symmetric — order of a and c does not matter', () => {
    const a = p(1, 0.3), b = p(0.5, 0.5), c = p(0.2, 0.8);
    expect(angleDeg(a, b, c)).toBeCloseTo(angleDeg(c, b, a), 8);
  });
});
