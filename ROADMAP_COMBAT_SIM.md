# Combat Simulation Mode — Roadmap

_Last updated: 2026-07-12. Resume here after service._

---

## Pre-Build Requirements

Resolve these before writing a single line of Phase 1 code.

1. **MediaPipe bundle** — `vision_bundle-*.js` (~134 kB) is already bundled in the app. Confirm which model it exposes: Pose (33 landmarks, needed for slip/guard detection) or Face/Hands only. Check `src/` for the import source. If it's not Pose, add `@mediapipe/tasks-vision` and re-evaluate bundle impact.

2. **Self-report bias** — Users in "Simulation Mode" who self-report will lie under pressure. Decision needed: (a) wrong answers silently reduce accuracy score with no feedback, (b) deduct XP explicitly, or (c) trust self-report fully and add a disclaimer. This choice shapes the scoring formula in `weaknessAccumulator.js`.

3. **Connectivity fallback** — The AI weakness report (Phase 3) requires a Claude API call at session end. If offline, `generateWeaknessReport()` must fall back to the existing static `buildSummary()` function in `TrainingMode.jsx`. Confirm whether the app already has an offline/connectivity check utility, or build one.

4. **Mode separation** — Simulation Mode must be a toggle alongside the existing Combo Drill mode, not a replacement. Decide: separate screen entry point on the dashboard, or a toggle inside the existing TrainingMode UI before session start.

5. **Reaction window tuning** — 2.2 s for slips, 3.0 s for kick checks are estimates. These need live testing before the first real session. Make them constants in `opponentCues.js` so they can be adjusted without touching logic.

---

## Current State of the App

What exists today in `src/components/TrainingMode.jsx`:

```
TrainingMode.jsx
├── Static COMBOS[] + MOTIVATIONAL[] arrays — random pick per interval
├── Web Speech API (speak fn) — one-way TTS output only
├── rAF stats loop — simulated stat drift, no real user input
├── MirrorView component — live camera display only, no analysis
├── buildSummary() — weighted formula: timing×0.4 + stance×0.35 + power×0.25
├── 3-second countdown overlay before session start
└── Sticky bottom action bar (Stop / Finish buttons)
```

Everything is output-only. No user input channel exists. No real-time validation.

---

## Target Architecture

```
┌─────────────────────────────────────────────────────┐
│                  CombatSimulation                   │
│                                                     │
│  OpponentEngine  →  CueDispatcher  →  SpeechOut     │
│        ↓                                            │
│  ReactionWindow  ←  CameraAnalyzer  (MediaPipe)     │
│        ↓                                            │
│  ResponseScorer  →  WeaknessAccumulator             │
│        ↓                                            │
│  SessionReport   (Claude API call at session end)   │
└─────────────────────────────────────────────────────┘
```

---

## Component Specs

### 1. OpponentEngine (`src/services/opponentEngine.js`)

Replaces the static `COMBOS[]` random-pick with a state machine.

```js
const OPPONENT_STATES = {
  neutral:    { transitions: ['jab_probe', 'feint', 'body_shot'] },
  pressuring: { transitions: ['jab_cross', 'hooks', 'clinch_attempt'] },
  retreating: { transitions: ['counter_jab', 'reset', 'distance'] },
}
```

State transitions are driven by the user's last response: success → opponent presses; failure → repeat the same drill type.

### 2. Opponent Cue Library (`src/data/opponentCues.js`)

Replaces `COMBOS[]` and `MOTIVATIONAL[]`. Each cue is a structured object:

```js
const OPPONENT_CUES = [
  {
    id: 'opp_jab',
    type: 'defensive',
    text: 'הוא זורק ג׳אב — החלק ותחזור עם קרוס!',
    expectedResponse: 'slip_counter',
    windowMs: 2200,
    discipline: ['boxing', 'muay-thai'],
  },
  {
    id: 'opp_low_kick',
    type: 'defensive',
    text: 'בעיטה נמוכה — הגן ותקוף מיד!',
    expectedResponse: 'check_counter',
    windowMs: 2500,
    discipline: ['muay-thai'],
  },
  {
    id: 'opp_drop_guard',
    type: 'offensive',
    text: 'הוא ירד את הידיים — ג׳אב, קרוס, הוק עכשיו!',
    expectedResponse: 'combo_attack',
    windowMs: 3000,
    discipline: ['boxing', 'muay-thai'],
  },
  // Target: 20–30 cues total, weighted by difficulty level
]
```

### 3. ReactionWindow UI (inside `TrainingMode.jsx` or new `SimulationMode.jsx`)

Visual component that appears after each opponent cue:

- Countdown bar drains over `windowMs` milliseconds
- **Phase 1 (self-report):** Two buttons — `הצלחתי ✓` / `פספסתי ✗`
- **Phase 4 (MediaPipe):** Hidden; camera classifier fires automatically

### 4. CameraAnalyzer (`src/services/reactionClassifier.js`)

_Phase 4 only. Skip in Phase 1–3._

```
MediaPipe Pose WASM (runs in-browser, ~2 MB)
  → 33 body landmarks at ~30 fps
  → derive: hand height delta, shoulder angle, hip rotation, weight shift

ReactionClassifier:
  input:  landmark deltas over 500 ms sliding window
  output: 'slip_left' | 'slip_right' | 'guard_raised' | 'kick_check' | 'idle'

Match output against cue.expectedResponse → pass/fail
```

**Fallback chain if camera denied:** accelerometer (`devicemotion` events) for slips/ducks only, then self-report.

### 5. WeaknessAccumulator (`src/services/weaknessAccumulator.js`)

Per-session in-memory object, reset on each new session:

```js
// Keyed by expectedResponse type
const tracker = {
  'slip_counter':  { attempts: 0, successes: 0, avgLatencyMs: 0 },
  'check_counter': { attempts: 0, successes: 0, avgLatencyMs: 0 },
  'combo_attack':  { attempts: 0, successes: 0, avgLatencyMs: 0 },
}

function recordResponse(cueId, success, latencyMs) {
  const type = CUE_MAP[cueId].expectedResponse
  tracker[type].attempts++
  if (success) tracker[type].successes++
  tracker[type].avgLatencyMs = rollingAverage(latencyMs)
}

// Weakness = successRate < 0.50 OR avgLatency > windowMs * 0.85
```

### 6. AI Weakness Report (`src/services/simulationReportService.js`)

Replaces `buildSummary()` at session end. One Claude API call:

```js
async function generateWeaknessReport(tracker, discipline, difficulty) {
  const data = Object.entries(tracker)
    .filter(([, v]) => v.attempts > 0)
    .map(([type, v]) => ({
      type,
      successRate: (v.successes / v.attempts).toFixed(2),
      avgLatencyMs: Math.round(v.avgLatencyMs),
    }))

  // POST to /api/combat-report (or direct Anthropic SDK call)
  // Model: claude-opus-4-7, adaptive thinking
  // Prompt instructs: 2–3 sharp Hebrew coaching observations
  // Example output: "הגנה שמאלית איטית — פספסת 3 מתוך 4 החלקות."
  // Fallback if offline: call existing buildSummary() from TrainingMode.jsx
}
```

---

## File Structure Changes

```
src/
  components/
    TrainingMode.jsx            ← add SimulationMode toggle; keep Combo Drill intact
    SimulationMode.jsx          ← new component, Phase 1+ (or fold into TrainingMode)
  services/
    opponentEngine.js           ← NEW — state machine + cue selection
    reactionClassifier.js       ← NEW — MediaPipe wrapper (Phase 4 only)
    weaknessAccumulator.js      ← NEW — per-session tracking
    simulationReportService.js  ← NEW — Claude API call + offline fallback
  data/
    opponentCues.js             ← NEW — replaces static COMBOS + MOTIVATIONAL
```

Existing files that change:
- `TrainingMode.jsx` — add mode toggle (Combo Drill vs Simulation), wire new services
- `Dashboard.jsx` — no changes needed until mode is ready to surface

---

## 5-Phase Build Order

| Phase | Deliverable | Est. Effort | Ships |
|-------|-------------|-------------|-------|
| **1** | `opponentCues.js` + `opponentEngine.js` state machine + TTS output | 1 day | TTS-only simulation, no validation |
| **2** | ReactionWindow UI — countdown bar + self-report buttons | 0.5 day | Playable with manual input |
| **3** | `weaknessAccumulator.js` + `simulationReportService.js` + Claude report | 1 day | Full v1, shippable |
| **4** | `reactionClassifier.js` — MediaPipe Pose integration | 2–3 days | Automatic reaction detection |
| **5** | Latency-based weakness scoring + per-discipline tuning | 1 day | Polished |

**Phase 1–3 = shippable v1** using self-report. No ML required.  
**Phase 4** is the upgrade that makes it fully automatic. Do not block v1 on it.

---

## Notes for Resume

- `vision_bundle` is already in the Vite build. Check `src/` for its import to confirm if it's Pose or another MediaPipe model before starting Phase 4.
- The existing `speak()` function in `TrainingMode.jsx` is reusable as-is for Phase 1 TTS output.
- `buildSummary()` in `TrainingMode.jsx` must remain intact as the offline fallback for Phase 3.
- Do not remove or modify existing Combo Drill mode. Simulation Mode is additive.
