# PRIME — 1% Better · CLAUDE.md

> **Every feature must fit VISION.md. If a request doesn't fit the vision, say so before building it. Never add features that aren't explicitly requested.**

**Project path:** `/Users/nwmkhn/Desktop/1-percent-better`
**Stack:** React 19 + Vite 8, inline styles only, RTL Hebrew (`direction: 'rtl'`), black-and-gold design.
**Package name:** `noam-habits-ai` · **No Next.js** — plain SPA.

---

## Firebase

Single project: **`better-de9aa`**

| Resource | Detail |
|---|---|
| Firestore | User profiles, habits, XP, workout history · My Tasks in `users/{uid}/tasks` |
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
    Legal.jsx
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
    MyTasks.jsx            # My Tasks card — top of Home
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
    streak.js              # getEffectiveStreak() — single source for streak display
    trackDay.js            # getTrackDay() — single source for "יום X/30"
    localDate.js           # getLocalDateKey() — local date, used ONLY by My Tasks
  services/
    firebase.js            # Firebase init — reads VITE_* env vars
    boxingVideoService.js  # Upload video → call analyzeBoxingSession function
    fcmService.js
    myTasksService.js      # My Tasks CRUD — Firestore users/{uid}/tasks, guest → localStorage
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
- **Dates** — existing code uses UTC keys (`toISOString().slice(0,10)`); only My Tasks uses local dates (`getLocalDateKey`). Don't mix them.
- **Combat screens** (boxing/MT path, preview, active, completion) render inside `FullScreen` in `Dashboard.jsx` — fixed overlay above tab bar.

---

## Git / GitHub

- Repo: **https://github.com/noam922008-ship-it/1percent-better** (public; transferred from `noam1better`)
- Auth: `gh` logged in as `noam922008-ship-it`. No token in the remote URL — keep it that way.
- Branches: `main` (= `my-tasks` @ `2ed9bdb`), `my-tasks`, `wip/muay-thai` (`08da753`) — all pushed.

---

## Done — 2026-09-24

All committed, pushed, and deployed (hosting:prime-app + firestore:rules):

- **6 bug fixes:** streak single source · track day single source · boxing/MT full-screen · profile photo fallback · camera rep warm-up (3s) · 390px ("גלה משימה", workout card header)
- **My Tasks:** input at top of Home, checkbox/text/delete, "מאתמול" carry-over, not connected to XP
- **Home reorder:** My Tasks → track → workout → השגרה שלי (open). Motivation messages, WeekStrip, surprise mission → Progress tab. Custom-habit link at top of habit sheet.
- **Firestore rules:** owner-only `users/{uid}/tasks` rule deployed.

Open:
- Workout-card overlap at 390px not reproduced as guest — verify logged-in.
- Revoke the old `noam1better` token that was exposed in the remote URL.
- Pre-existing lint: 5 errors / 11 warnings (not from this work).

---

## Recent git history

```
2ed9bdb  feat: reorder Home around the user's own tasks          ← HEAD (main, my-tasks)
3ebd03a  chore(rules): owner-only access for users/{uid}/tasks
f55451d  feat: My Tasks — the user's own daily tasks on Home
58eaa01  fix: prevent truncation and overlap in narrow home cards
efd4c6f  fix: warm-up countdown before camera rep counting
df6746c  fix: fallback for broken profile photo
cc9d22e  fix: open boxing and Muay Thai screens full-screen
6fe2378  fix: single source of truth for track day counter
d25c56b  fix: single source of truth for streak display
08da753  wip: snapshot uncommitted work — FCM, legal page, mission cards, focus triggers
```
