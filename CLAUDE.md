# PRIME — 1% Better · CLAUDE.md

**Project path:** `/Users/nwmkhn/Desktop/1-percent-better`
**Stack:** React 19 + Vite 8, inline styles only, RTL Hebrew (`direction: 'rtl'`), black-and-gold design.
**Package name:** `noam-habits-ai` · **No Next.js** — plain SPA.

---

## Firebase

Single project: **`better-de9aa`**

| Resource | Detail |
|---|---|
| Firestore | User profiles, habits, XP, workout history |
| Hosting site `prime-app-84fe0` | Live app → https://prime-app-84fe0.web.app |
| Hosting site `1percent-better-app` | 301 redirect target only — do not deploy content here |
| Functions | Node.js 22, region `europe-west1`, Firebase Functions v2 |
| Storage | `/workout-analysis/{uid}/{file}` — video upload for Gemini analysis |
| Secret Manager | `GEMINI_API_KEY` bound to `analyzeWithGemini` + `analyzeBoxingSession` via `defineSecret` |

`.firebaserc` targets:
- `prime-app` → `["prime-app-84fe0"]` (the live app)
- `prime` → `["1percent-better-app"]` (redirect only)

**Never use `prime` target for real deployments.**

---

## Deploy commands

```bash
# Frontend only
npx firebase-tools deploy --only hosting:prime-app --project better-de9aa

# Functions + Storage rules only (after secret is configured)
npx firebase-tools deploy --only functions,storage --project better-de9aa

# Both at once
npx firebase-tools deploy --only hosting:prime-app,functions,storage --project better-de9aa
```

Build first: `npm run build` (outputs to `dist/`).
CLI: `npx firebase-tools` (v15.30.1, not globally installed).

---

## GEMINI_API_KEY — STATUS: NOT YET DEPLOYED ⚠️

Functions require `GEMINI_API_KEY` stored in Secret Manager. **Not yet configured on `better-de9aa`.**

Steps when ready:
1. Enable Secret Manager API: https://console.cloud.google.com/apis/library/secretmanager.googleapis.com?project=better-de9aa
2. `npx firebase-tools functions:secrets:set GEMINI_API_KEY --project better-de9aa` (enter key at masked prompt — never paste in chat)
3. Verify: `npx firebase-tools functions:secrets:get GEMINI_API_KEY --project better-de9aa`
4. Deploy: `npx firebase-tools deploy --only functions,storage --project better-de9aa`

Until then, `analyzeWithGemini` and `analyzeBoxingSession` will fail at runtime (secret not bound).

---

## Source structure

```
src/
  pages/
    Dashboard.jsx          # Main app shell — all tabs, all modal state
    WorkoutsScreen.jsx     # Workouts tab
    AnalyticsTab.jsx       # Progress/analytics tab
    ArenaPage.jsx
    InitiationFlow.jsx
    WelcomeScreen.jsx
    OnboardingFlow.jsx / OnboardingPage.jsx
    Legal.jsx              # UNTRACKED — not committed yet
  components/
    boxing/                # Boxing drill system (full, committed)
      BoxingPathScreen.jsx     # Home + drill selector + guided course
      BoxingDrillTimer.jsx     # Round timer with Web Audio beeps
      BoxingSessionAnalysis.jsx  # Video analysis (requires functions)
      BoxingFormAnalysis.jsx     # Single-image posture check
      BoxingCompletion.jsx / BoxingWorkoutPreview.jsx / BoxingActiveWorkout.jsx
    combat/
      CombatPathScreen.jsx   # Generic combat path (boxing course + MT)
      CombatActiveWorkout.jsx / CombatCompletion.jsx / CombatWorkoutPreview.jsx
    muaythai/
      MuayThaiPathScreen.jsx   # Thin wrapper over CombatPathScreen
    auth/AuthModal.jsx
    dashboard/WeekStrip.jsx
    [many other feature components]
  data/
    boxingDrills.js        # All boxing drill rounds + MT_ELBOW_ROUNDS
                           # DRILL_CATEGORIES excludes 'mt-elbows' (boxing UI isolation)
    boxingPath.js          # Boxing guided course levels/workouts
    muayThaiPath.js        # MT levels/workouts
    [challenges, habits, lessons, etc.]
  utils/
    boxingProgress.js
    muayThaiProgress.js    # Wraps combatProgress.js engine for MT
    combatProgress.js      # Generic createCombatProgressionEngine factory
  services/
    firebase.js            # Firebase init — reads VITE_* env vars
    boxingVideoService.js  # Upload video → call analyzeBoxingSession function
    fcmService.js          # UNTRACKED — not committed yet
    [geminiClient, workoutRewardService, etc.]
  context/
    AuthContext.jsx        # useAuth() — use this, NOT react-firebase-hooks
    UserContext.jsx
  config/xp.js
functions/
  index.js                 # All Cloud Functions
```

---

## Key architecture decisions

- **Inline styles everywhere** — no CSS files, no Tailwind. Colors via local `C = { bg, surface, border, text, muted, accent, ... }` objects.
- **`useAuth()` from `../../context/AuthContext`** — never import `react-firebase-hooks/auth` (not installed).
- **MT quick-start reuses boxing infrastructure** — `BoxingDrillTimer` launched directly from `Dashboard.jsx` state (`mtDrillActive`). No separate MT timer.
- **`mt-elbows` category** — exists in `CATEGORY_ROUNDS_MAP` + `CATEGORY_TITLES` in `boxingDrills.js` but NOT in `DRILL_CATEGORIES` array. This keeps elbows invisible in the boxing UI while MT quick-start can access it directly via `buildDrill('mt-elbows', dur)`.
- **XP guard on MT drills** — `durationSeconds >= 60 || roundsCompleted >= 1` before calling `claimDailyWorkoutReward`.
- **Gemini models** — both functions use `gemini-2.5-flash`. `gemini-2.0-flash` deprecated June 2026, `gemini-1.5-flash` also deprecated.
- **`buildDrill(categoryId, durationMin, skipWarmup?)`** and **`getLastDuration()`** exported from `boxingDrills.js`, used by both `BoxingPathScreen` and `Dashboard`.
- **Functions region** — always `europe-west1` (nearest to Israel).

---

## Uncommitted changes (not yet committed as of last session)

These files were modified but not committed with the boxing work. Review before committing:

```
src/App.jsx
src/components/MirrorCard.jsx
src/components/ProofOfActionModal.jsx
src/components/SurpriseMissionCard.jsx
src/data/dailyLessons.js
src/data/surpriseMissions.js
src/pages/ArenaPage.jsx
src/pages/InitiationFlow.jsx
src/pages/WelcomeScreen.jsx
src/services/firebase.js
src/services/focusTriggerService.js
src/services/notificationService.js
firestore.rules
index.html
public/sw.js
.env.example
functions/package-lock.json
```

Untracked (new files, not staged):
```
src/__tests__/fcmService.test.js
src/pages/Legal.jsx
src/services/fcmService.js
```

---

## Planned but not yet started

The following was scoped and approved but **not implemented**:

**PHASE 1 — Bugs:**
1. Streak inconsistency: "3 ימים ברצף" vs "הרצף קטוע" — not one source of truth
2. Track day counter: Home shows 10/30, Progress tab shows 9/30
3. Boxing screen opens below viewport on mobile instead of full-screen
4. Profile image broken — shows "פרופיל" text, needs initials/icon fallback
5. Camera rep counter fires one rep on screen open — needs warm-up delay
6. 390px layout: "גלה משימה" truncated, workout card buttons overlap

**PHASE 2 — My Tasks:**
- Input at top of Home ("היום"): "מה אתה חייב לעשות היום?" → creates one-off tasks
- Checkbox + text + delete. No categories/dates/priorities.
- Incomplete tasks carry over with "מאתמול" label
- Stored per-user in Firestore (existing backend). No new libraries.
- NOT connected to XP yet.

**PHASE 3 — Home screen reorder:**
- Order: My Tasks → daily track challenge → daily workout → "השגרה שלי"
- "השגרה שלי" expanded by default; "צור הרגל מותאם אישית" link moves to top of sheet
- Motivation message, surprise task, weekly activity bar → move to Progress tab

---

## Recent git history

```
45ede59  feat: add quick boxing and Muay Thai workouts          ← HEAD
f1953ac  feat: daily learning card, home hierarchy, progress improvements
51e17cf  fix: resolve repeated daily task bug across all challenge protocols
9dfc92c  Rebuild dashboard home tab: side progress panel, weekly strip, RTL fixes
```
