'use strict';

const { onSchedule }              = require('firebase-functions/v2/scheduler');
const { onDocumentWritten }       = require('firebase-functions/v2/firestore');
const { onCall, HttpsError }      = require('firebase-functions/v2/https');
const { defineSecret }            = require('firebase-functions/params');
const { initializeApp }           = require('firebase-admin/app');
const { getFirestore }            = require('firebase-admin/firestore');
const { getMessaging }            = require('firebase-admin/messaging');
const { GoogleGenerativeAI }      = require('@google/generative-ai');
const { GoogleAIFileManager }     = require('@google/generative-ai/server');
const { getStorage }              = require('firebase-admin/storage');

const geminiApiKey = defineSecret('GEMINI_API_KEY');

initializeApp();

// ── analyzeWithGemini — secure Gemini proxy ───────────────────────────────────
// Callable from the frontend. Requires Firebase Auth (blocks unauthenticated
// and guest callers — those fall back to static responses on the client).
//
// Request data:
//   prompt          string | object[]  — text prompt or pre-built content array
//   imageBase64     string?            — base64-encoded image (no data: prefix)
//   imageMimeType   string?            — e.g. "image/jpeg"
//   systemInstruction string?          — optional model system instruction
//   model           string?            — default "gemini-2.5-flash"
//
// Response: { text: string }

const GEMINI_DAILY_LIMIT = 20;

// Atomically increments the daily call counter for uid.
// Returns false and does NOT increment if the limit is already reached.
// Uses a transaction so concurrent calls don't race past the cap.
async function checkGeminiRateLimit(db, uid) {
  const today = todayIsraelDateKey();
  const ref   = db.collection('geminiUsage').doc(uid);
  let allowed = false;
  await db.runTransaction(async (txn) => {
    const snap  = await txn.get(ref);
    const data  = snap.data() || {};
    const calls = (data.date === today ? (data.calls || 0) : 0);
    if (calls >= GEMINI_DAILY_LIMIT) { allowed = false; return; }
    txn.set(ref, { date: today, calls: calls + 1 }, { merge: false });
    allowed = true;
  });
  return allowed;
}

exports.analyzeWithGemini = onCall(
  {
    region:          'europe-west1',
    memory:          '512MiB',
    timeoutSeconds:  30,
    secrets:         [geminiApiKey],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = request.auth.uid;
    const db  = getFirestore();
    const allowed = await checkGeminiRateLimit(db, uid);
    if (!allowed) {
      throw new HttpsError(
        'resource-exhausted',
        `Daily AI limit of ${GEMINI_DAILY_LIMIT} calls reached. Try again tomorrow.`
      );
    }

    const {
      prompt,
      imageBase64,
      imageMimeType = 'image/jpeg',
      systemInstruction,
      model: modelName = 'gemini-2.5-flash',
    } = request.data || {};

    if (!prompt && !imageBase64) {
      throw new HttpsError('invalid-argument', 'prompt or imageBase64 required.');
    }

    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'Gemini API key not configured.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      ...(systemInstruction ? { systemInstruction } : {}),
    });

    // Build content array
    let contents;
    if (imageBase64) {
      contents = [{
        parts: [
          ...(prompt ? [{ text: prompt }] : []),
          { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
        ],
      }];
    } else {
      contents = prompt;  // string or pre-built content array
    }

    try {
      const result = await model.generateContent(contents);
      return { text: result.response.text().trim() };
    } catch (err) {
      console.error('[analyzeWithGemini] Gemini error:', err?.message);
      throw new HttpsError('internal', 'Gemini request failed.');
    }
  }
);

// ── analyzeBoxingSession — temporal video analysis ────────────────────────────
// Downloads video from Firebase Storage to a Buffer (no temp file), uploads to
// Gemini Files API, polls until ACTIVE, analyzes with structured JSON prompt,
// then deletes the file from both Gemini and Storage.
//
// Request data:
//   storagePath  string  — path in Firebase Storage ("workout-analysis/{uid}/{file}")
//
// Response: { analysis: { canAssess, limitations, strength, priorityCorrections,
//                         repeatedMistakes, timelineObservations, practiceAction } }

const SERVER_VALIDATION = {
  MAX_BYTES:    100 * 1024 * 1024,           // 100 MB
  TS_PATTERN:   /^\d+:\d{2}$/,              // "M:SS" or "MM:SS"
  CATEGORIES:   new Set(['guard','punch','footwork','defense']),
};

function sanitizeAnalysis(obj) {
  // Sanitize timestamps; ensure category values are in allowed set
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.canAssess !== 'boolean') return false;
  if (!obj.canAssess) return true; // only limitations needed when canAssess=false

  // Normalize priority corrections
  if (!Array.isArray(obj.priorityCorrections)) return false;
  for (const c of obj.priorityCorrections) {
    if (c.timestamp !== null && !SERVER_VALIDATION.TS_PATTERN.test(String(c.timestamp ?? ''))) {
      c.timestamp = null;
    }
    if (!SERVER_VALIDATION.CATEGORIES.has(c.category)) c.category = 'guard';
  }
  // Enforce exactly 2 items
  while (obj.priorityCorrections.length < 2) obj.priorityCorrections.push({ category: 'guard', he: '', timestamp: null });
  obj.priorityCorrections = obj.priorityCorrections.slice(0, 2);

  // Normalize timeline observations
  if (!Array.isArray(obj.timelineObservations)) obj.timelineObservations = [];
  for (const o of obj.timelineObservations) {
    if (o.time !== null && !SERVER_VALIDATION.TS_PATTERN.test(String(o.time ?? ''))) o.time = null;
    if (!SERVER_VALIDATION.CATEGORIES.has(o.category)) o.category = 'guard';
  }
  obj.timelineObservations = obj.timelineObservations.slice(0, 6);

  if (!Array.isArray(obj.repeatedMistakes)) obj.repeatedMistakes = [];
  return true;
}

exports.analyzeBoxingSession = onCall(
  {
    region:         'europe-west1',
    memory:         '1GiB',
    timeoutSeconds: 120,
    secrets:        [geminiApiKey],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = request.auth.uid;
    const { storagePath } = request.data || {};

    if (!storagePath || typeof storagePath !== 'string') {
      throw new HttpsError('invalid-argument', 'storagePath required.');
    }

    // Ownership check — path must start with the caller's uid segment
    const expectedPrefix = `workout-analysis/${uid}/`;
    if (!storagePath.startsWith(expectedPrefix)) {
      throw new HttpsError('permission-denied', 'Access denied.');
    }

    // No path traversal
    const filename = storagePath.slice(expectedPrefix.length);
    if (filename.includes('/') || filename.includes('..')) {
      throw new HttpsError('invalid-argument', 'Invalid storagePath.');
    }

    const db      = getFirestore();
    const allowed = await checkGeminiRateLimit(db, uid);
    if (!allowed) {
      throw new HttpsError('resource-exhausted', `Daily AI limit of ${GEMINI_DAILY_LIMIT} calls reached.`);
    }

    const apiKey = geminiApiKey.value();
    if (!apiKey || apiKey.startsWith('PASTE_')) {
      throw new HttpsError('failed-precondition', 'Gemini API key not configured.');
    }

    const bucket      = getStorage().bucket();
    const storageFile = bucket.file(storagePath);
    let geminiFileName = null;

    try {
      // 1. Server-side file metadata validation (before downloading)
      const [metadata] = await storageFile.getMetadata();
      const contentType = metadata.contentType || '';
      if (!contentType.startsWith('video/')) {
        throw new HttpsError('invalid-argument', 'File must be a video.');
      }
      const sizeBytes = parseInt(metadata.size, 10);
      if (isNaN(sizeBytes) || sizeBytes > SERVER_VALIDATION.MAX_BYTES) {
        throw new HttpsError('invalid-argument', 'File exceeds 100 MB limit.');
      }

      // 2. Download to Buffer — no temp file needed; uploadFile() accepts Buffer directly
      const [videoBuffer] = await storageFile.download();

      // 3. Upload to Gemini Files API
      const fileManager   = new GoogleAIFileManager(apiKey);
      const uploadResult  = await fileManager.uploadFile(videoBuffer, {
        mimeType:    contentType,
        displayName: `boxing-${uid}`,
      });
      geminiFileName       = uploadResult.file.name;
      const fileUri        = uploadResult.file.uri;

      // 4. Poll until ACTIVE (Gemini processes video server-side before analysis)
      let fileState = uploadResult.file;
      let polls     = 0;
      while (fileState.state === 'PROCESSING' && polls < 18) {
        await new Promise(r => setTimeout(r, 5000));
        fileState = await fileManager.getFile(geminiFileName);
        polls++;
      }
      if (fileState.state !== 'ACTIVE') {
        throw new HttpsError('internal', `Video processing failed (state: ${fileState.state}).`);
      }

      // 5. Analyze — gemini-2.5-flash supports video via Files API and structured JSON output
      //    responseMimeType enforces JSON output; supported since SDK v0.12.0
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model:            'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
      });

      const prompt =
`You are an expert boxing coach reviewing a training session video.

Analyze the footage. Return ONLY valid JSON — no markdown, no prose outside JSON:
{
  "canAssess": true,
  "limitations": "describe what you cannot assess from this footage, or null if footage is fully usable",
  "strength": { "he": "one specific thing they do well — in Hebrew" },
  "priorityCorrections": [
    { "category": "guard|punch|footwork|defense", "he": "specific issue in Hebrew", "timestamp": "M:SS or null" },
    { "category": "guard|punch|footwork|defense", "he": "specific issue in Hebrew", "timestamp": "M:SS or null" }
  ],
  "repeatedMistakes": ["mistake in Hebrew"],
  "timelineObservations": [
    { "time": "M:SS", "category": "guard|punch|footwork|defense", "he": "observation in Hebrew" }
  ],
  "practiceAction": {
    "titleHe": "drill name in Hebrew",
    "instructionHe": "3-minute corrective drill instructions in Hebrew",
    "durationMinutes": 3
  }
}

Rules:
- Set canAssess=false and limitations=reason if footage is too dark, wrong angle, or not boxing. All other fields null.
- Use video timestamps like "0:05" or "1:23". If timestamp is uncertain, use null — do NOT guess.
- priorityCorrections: exactly 2 items addressing the two most important issues.
- timelineObservations: 3–6 key moments you can clearly see. Do not invent observations.
- repeatedMistakes: only mistakes that appear more than once in the footage.
- practiceAction.instructionHe must target the first priorityCorrection specifically.
- All Hebrew fields in Hebrew only. No markdown inside field values.`;

      const result = await model.generateContent([
        { text: prompt },
        { fileData: { mimeType: contentType, fileUri } },
      ]);

      const raw   = result.response.text().trim();
      const start = raw.indexOf('{');
      const end   = raw.lastIndexOf('}');
      if (start === -1 || end === -1) {
        throw new HttpsError('internal', 'Model returned non-JSON response.');
      }

      let analysis;
      try {
        analysis = JSON.parse(raw.slice(start, end + 1));
      } catch {
        throw new HttpsError('internal', 'Failed to parse analysis JSON.');
      }

      if (!sanitizeAnalysis(analysis)) {
        throw new HttpsError('internal', 'Analysis response missing required fields.');
      }

      return { analysis };

    } finally {
      // Cleanup: delete Gemini file and Storage file regardless of outcome
      // Note: if the function is killed by timeout, this block does not run.
      // The Storage file will be cleaned up by the client; the Gemini file
      // expires automatically after 48 hours per Files API policy.
      if (geminiFileName) {
        const fm = new GoogleAIFileManager(apiKey);
        fm.deleteFile(geminiFileName).catch(() => {});
      }
      storageFile.delete().catch(() => {});
    }
  }
);

// ── Accountability copy ────────────────────────────────────────────────────────

const ACCOUNTABILITY_COPY = {
  he: (appName) => ({
    title: `🔐 לפני שתפתח את ${appName}…`,
    body:  'עשית 15 שכיבות סמיכה? בוא להרוויח את ה-XP שלך ולפתוח את הגלילה.',
    lang:  'he',
  }),
  en: (appName) => ({
    title: `🔐 Before you open ${appName}…`,
    body:  'Did you do your 15 push-ups? Come earn your XP and unlock your scroll time.',
    lang:  'en',
  }),
  ar: (appName) => ({
    title: `🔐 قبل أن تفتح ${appName}…`,
    body:  'هل أنهيت 15 ضغطة أرضية؟ تعال واكسب XP الخاص بك.',
    lang:  'ar',
  }),
};

// ── Helper: stale token cleanup (shared) ─────────────────────────────────────

async function purgeStaleTokens(db, staleTokens, tokenToUid) {
  if (!staleTokens.size) return;
  const affectedUids = new Set(
    [...staleTokens].map(t => tokenToUid.get(t)).filter(Boolean)
  );
  for (const uid of affectedUids) {
    const ref  = db.collection('users').doc(uid);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const { fcmTokens = [], fcmToken } = snap.data();
    const clean  = fcmTokens.filter(t => !staleTokens.has(t));
    const update = { fcmTokens: clean };
    if (fcmToken && staleTokens.has(fcmToken)) update.fcmToken = clean.at(-1) ?? '';
    await ref.update(update);
  }
  console.log(`[purgeStaleTokens] purged ${staleTokens.size} tokens from ${affectedUids.size} users`);
}

// ── Copy variants ─────────────────────────────────────────────────────────────
// Three punchy lines per language, rotated randomly per user so the nudge
// feels fresh and doesn't read as automated spam.

const NUDGE_COPY = {
  he: [
    {
      title: 'ה-Streak שלך בסכנה! 🔥',
      body:  'נשאר לך עוד קצת כדי לסגור את היום ב-1% טוב יותר.',
    },
    {
      title: 'אל תוותר לעצמך היום ⚔️',
      body:  'כנס לסמן את ההרגלים שלך עכשיו.',
    },
    {
      title: 'מצב מונק מוד מופעל? 🧠',
      body:  'אל תפיל את הרצף, המשימות מחכות לך.',
    },
  ],
  en: [
    {
      title: 'Your streak is at risk! 🔥',
      body:  "Close today 1% better — you're almost there.",
    },
    {
      title: "Don't quit on yourself today ⚔️",
      body:  'Check in and mark your habits now.',
    },
    {
      title: 'Monk Mode activated? 🧠',
      body:  "Don't break the streak — your missions are waiting.",
    },
  ],
  ar: [
    {
      title: 'سلسلتك في خطر! 🔥',
      body:  'أكمل يومك الآن لتكون أفضل بنسبة 1٪.',
    },
    {
      title: 'لا تتخلى عن نفسك اليوم ⚔️',
      body:  'سجّل عاداتك وأغلق يومك بقوة.',
    },
    {
      title: 'وضع الرهبان مفعّل؟ 🧠',
      body:  'لا تكسر السلسلة، مهامك بانتظارك.',
    },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** YYYY-MM-DD in Israel local time — matches client dateKey() which uses getFullYear/Month/Date. */
function todayIsraelDateKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
}

function pickCopy(lang) {
  const pool = NUDGE_COPY[lang] || NUDGE_COPY.he;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Returns true if the user has already completed their daily activity today.
 * Uses two independent signals so a syncing delay in one doesn't cause false nudges.
 */
function isCompletedToday(userData, today) {
  const streak = userData.streak || {};
  // Client saves streak.lastDate (not lastPostDate — fixed field name)
  if (streak.lastDate === today) return true;

  const quests = userData[`dailyQuests_${today}`] || {};
  if (quests.pushup && quests.monkMode && quests.quickReview) return true;

  return false;
}

// ── FCM push notification functions ──────────────────────────────────────────
// NOTE: dailyHabitNudge, accountabilityReminder, broadcastUpdate, and
// sendTestNotification all use Firebase Cloud Messaging (Admin SDK) and require
// the Blaze (pay-as-you-go) plan to deploy. They are intentionally left here
// for future reintroduction. The client does NOT call any of these functions —
// local browser notifications (Notification API) handle all user-facing nudges.

// ── Scheduled function ────────────────────────────────────────────────────────
// Fires every day at 19:30 Israel local time (handles IDT/IST automatically).
// Sends only to users who haven't completed today's activity.

exports.dailyHabitNudge = onSchedule(
  {
    schedule:       '30 19 * * *',
    timeZone:       'Asia/Jerusalem',
    region:         'europe-west1',   // nearest region to Israel
    memory:         '256MiB',
    timeoutSeconds: 300,
  },
  async () => {
    const db        = getFirestore();
    const messaging = getMessaging();
    const today     = todayIsraelDateKey();

    console.log(`[dailyHabitNudge] running for date=${today}`);

    const usersSnap = await db.collection('users').get();
    if (usersSnap.empty) {
      console.log('[dailyHabitNudge] no users found');
      return;
    }

    const messages    = [];
    const tokenToUid  = new Map();

    for (const doc of usersSnap.docs) {
      const d = doc.data();

      // Deduplicate tokens (fcmTokens array + legacy fcmToken scalar)
      const tokenSet = new Set(Array.isArray(d.fcmTokens) ? d.fcmTokens : []);
      if (d.fcmToken) tokenSet.add(d.fcmToken);
      if (!tokenSet.size) continue;

      if (isCompletedToday(d, today)) continue;

      const copy = pickCopy(d.lang || 'he');

      for (const token of tokenSet) {
        tokenToUid.set(token, doc.id);
        messages.push({
          token,
          webpush: {
            headers: { Urgency: 'high' },
            // Use webpush.data (flat keys) so the app's service-worker push
            // handler receives { title, body, url, icon, badge, tag } directly.
            data: {
              title: copy.title,
              body:  copy.body,
              url:   'https://better-de9aa.web.app/#hub',
              icon:  '/icon-192.png',
              badge: '/icon-192.png',
              tag:   'daily-nudge',
            },
          },
        });
      }
    }

    if (!messages.length) {
      console.log(`[dailyHabitNudge] ${today}: all users already done — no nudges sent`);
      return;
    }

    // FCM sendEach → max 500 per call
    let sent = 0, failed = 0;
    const staleTokens = new Set();

    for (let i = 0; i < messages.length; i += 500) {
      const chunk  = messages.slice(i, i + 500);
      const result = await messaging.sendEach(chunk);

      result.responses.forEach((r, idx) => {
        if (r.success) {
          sent++;
        } else {
          failed++;
          const code = r.error?.code || '';
          // Registration-not-found or invalid token → stale, safe to purge
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            staleTokens.add(chunk[idx].token);
          }
          console.warn(`[FCM] token error uid=${tokenToUid.get(chunk[idx].token)} code=${code}`);
        }
      });
    }

    await purgeStaleTokens(db, staleTokens, tokenToUid);
    console.log(`[dailyHabitNudge] ${today}: sent=${sent} failed=${failed} stale_cleaned=${staleTokens.size} total_eligible=${messages.length}`);
  }
);

// ── accountabilityReminder ────────────────────────────────────────────────────
// Fires daily at 18:00 Israel time.
// Sends personalized "Before you open TikTok…" FCM push to PRO users
// who have configured at least one accountability app.

exports.accountabilityReminder = onSchedule(
  {
    schedule:       '0 18 * * *',
    timeZone:       'Asia/Jerusalem',
    region:         'europe-west1',
    memory:         '256MiB',
    timeoutSeconds: 300,
  },
  async () => {
    const db        = getFirestore();
    const messaging = getMessaging();

    console.log('[accountabilityReminder] running');

    // Query PRO users — filter accountabilityApps in-process to avoid composite index
    const usersSnap = await db.collection('users').where('isPro', '==', true).get();
    if (usersSnap.empty) {
      console.log('[accountabilityReminder] no PRO users');
      return;
    }

    const messages   = [];
    const tokenToUid = new Map();

    for (const doc of usersSnap.docs) {
      const d = doc.data();

      const apps = Array.isArray(d.accountabilityApps) ? d.accountabilityApps : [];
      if (apps.length === 0) continue;

      // Collect tokens
      const tokenSet = new Set(Array.isArray(d.fcmTokens) ? d.fcmTokens : []);
      if (d.fcmToken) tokenSet.add(d.fcmToken);
      if (!tokenSet.size) continue;

      const lang    = d.lang || 'en';
      const appName = apps[0]; // most important app (first in list)
      const copy    = (ACCOUNTABILITY_COPY[lang] || ACCOUNTABILITY_COPY.en)(appName);

      for (const token of tokenSet) {
        tokenToUid.set(token, doc.id);
        messages.push({
          token,
          webpush: {
            headers: { Urgency: 'high' },
            data: {
              title: copy.title,
              body:  copy.body,
              lang:  copy.lang,
              url:   'https://better-de9aa.web.app/#focus-gate',
              icon:  '/icon-192.png',
              badge: '/icon-192.png',
              tag:   'accountability-lock',
            },
          },
        });
      }
    }

    if (!messages.length) {
      console.log('[accountabilityReminder] no eligible users with apps configured');
      return;
    }

    let sent = 0, failed = 0;
    const staleTokens = new Set();

    for (let i = 0; i < messages.length; i += 500) {
      const chunk  = messages.slice(i, i + 500);
      const result = await messaging.sendEach(chunk);
      result.responses.forEach((r, idx) => {
        if (r.success) {
          sent++;
        } else {
          failed++;
          const code = r.error?.code || '';
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            staleTokens.add(chunk[idx].token);
          }
          console.warn(`[accountabilityReminder] token error uid=${tokenToUid.get(chunk[idx].token)} code=${code}`);
        }
      });
    }

    await purgeStaleTokens(db, staleTokens, tokenToUid);
    console.log(`[accountabilityReminder] sent=${sent} failed=${failed} stale_cleaned=${staleTokens.size} total_eligible=${messages.length}`);
  }
);

// ── broadcastUpdate ───────────────────────────────────────────────────────────
// Triggered when config/app is written.
// Set pendingBroadcast: true (+ version + message) via broadcast-update.cjs or
// the Firebase console — this function fires, pushes to every user with an FCM
// token, then resets pendingBroadcast to false and logs stats.
//
// Firestore config/app schema:
//   version:          string   — current app version, e.g. "2.0.0"
//   forceUpdate:      boolean  — if true, client blocks until user refreshes
//   pendingBroadcast: boolean  — set true to trigger this function
//   broadcastTitle:   string?  — optional override push title
//   broadcastBody:    string?  — optional override push body

const DEFAULT_BROADCAST_TITLE = '🚀 1% Better just got better!';
const DEFAULT_BROADCAST_BODY  = "🚀 Upgrade Alert: The new version of 1% Better is live! Open the app to experience the latest features.";
const APP_URL                  = 'https://better-de9aa.web.app/';

exports.broadcastUpdate = onDocumentWritten(
  {
    document:       'config/app',
    region:         'europe-west1',
    memory:         '256MiB',
    timeoutSeconds: 300,
  },
  async (event) => {
    const after  = event.data?.after?.data();
    const before = event.data?.before?.data();

    // Only proceed if pendingBroadcast just became true
    if (!after?.pendingBroadcast) return;
    if (before?.pendingBroadcast === true) return; // already processed

    const db        = getFirestore();
    const messaging = getMessaging();
    const version   = after.version || 'latest';
    const title     = after.broadcastTitle || DEFAULT_BROADCAST_TITLE;
    const body      = after.broadcastBody  || DEFAULT_BROADCAST_BODY;

    console.log(`[broadcastUpdate] version=${version} — collecting tokens`);

    // Reset flag immediately so a retry doesn't double-send
    await db.collection('config').doc('app').update({
      pendingBroadcast:  false,
      lastBroadcastAt:   new Date().toISOString(),
      lastBroadcastVersion: version,
    });

    const usersSnap = await db.collection('users').get();
    if (usersSnap.empty) {
      console.log('[broadcastUpdate] no users');
      return;
    }

    const messages   = [];
    const tokenToUid = new Map();

    for (const doc of usersSnap.docs) {
      const d = doc.data();
      const tokenSet = new Set(Array.isArray(d.fcmTokens) ? d.fcmTokens : []);
      if (d.fcmToken) tokenSet.add(d.fcmToken);
      if (!tokenSet.size) continue;

      for (const token of tokenSet) {
        tokenToUid.set(token, doc.id);
        messages.push({
          token,
          webpush: {
            headers: { Urgency: 'high' },
            data: {
              title,
              body,
              url:   APP_URL,
              icon:  '/icon-192.png',
              badge: '/icon-192.png',
              tag:   'app-update',
            },
          },
        });
      }
    }

    if (!messages.length) {
      console.log('[broadcastUpdate] no tokens found — no notifications sent');
      return;
    }

    let sent = 0, failed = 0;
    const staleTokens = new Set();

    for (let i = 0; i < messages.length; i += 500) {
      const chunk  = messages.slice(i, i + 500);
      const result = await messaging.sendEach(chunk);
      result.responses.forEach((r, idx) => {
        if (r.success) {
          sent++;
        } else {
          failed++;
          const code = r.error?.code || '';
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            staleTokens.add(chunk[idx].token);
          }
          console.warn(`[broadcastUpdate] token error uid=${tokenToUid.get(chunk[idx].token)} code=${code}`);
        }
      });
    }

    await purgeStaleTokens(db, staleTokens, tokenToUid);

    // Write final stats back to config doc
    await db.collection('config').doc('app').update({
      lastBroadcastStats: { sent, failed, stale: staleTokens.size, total: messages.length },
    });

    console.log(`[broadcastUpdate] version=${version} sent=${sent} failed=${failed} stale=${staleTokens.size} total=${messages.length}`);
  }
);

// ── sendTestNotification ──────────────────────────────────────────────────────
// Callable from the client. Sends a real FCM push to all registered tokens for
// the authenticated user — useful for end-to-end testing without waiting for the
// scheduled nudge. Requires the user to be registered (tokens in users/{uid}).

exports.sendTestNotification = onCall(
  {
    region:         'europe-west1',
    memory:         '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = request.auth.uid;
    const db        = getFirestore();
    const messaging = getMessaging();

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User document not found. Register a push token first.');
    }

    const { fcmTokens = [], fcmToken } = userDoc.data();
    const tokenSet = new Set(Array.isArray(fcmTokens) ? fcmTokens : []);
    if (fcmToken) tokenSet.add(fcmToken);

    if (!tokenSet.size) {
      throw new HttpsError('failed-precondition', 'No FCM tokens registered for this user.');
    }

    let sent = 0, failed = 0;
    const staleTokens = new Set();
    const tokenToUid  = new Map([[...tokenSet].join(','), uid]);

    for (const token of tokenSet) {
      tokenToUid.set(token, uid);
      try {
        await messaging.send({
          token,
          webpush: {
            headers: { Urgency: 'high' },
            data: {
              title: '🧪 PRIME — בדיקת Push',
              body:  'ההתראה הגיעה! כל המערכת עובדת.',
              url:   '/',
              icon:  '/icon-192.png',
              badge: '/icon-192.png',
              tag:   'prime-test-backend',
            },
          },
        });
        sent++;
      } catch (err) {
        failed++;
        const code = err?.errorInfo?.code || '';
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          staleTokens.add(token);
        }
        console.warn(`[sendTestNotification] uid=${uid} token_error=${code}`);
      }
    }

    await purgeStaleTokens(db, staleTokens, tokenToUid);
    console.log(`[sendTestNotification] uid=${uid} sent=${sent} failed=${failed}`);
    return { sent, failed, total: tokenSet.size };
  }
);
