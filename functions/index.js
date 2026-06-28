'use strict';

const { onSchedule }           = require('firebase-functions/v2/scheduler');
const { onDocumentWritten }    = require('firebase-functions/v2/firestore');
const { onCall, HttpsError }   = require('firebase-functions/v2/https');
const { defineSecret }         = require('firebase-functions/params');
const { initializeApp }        = require('firebase-admin/app');
const { getFirestore }         = require('firebase-admin/firestore');
const { getMessaging }         = require('firebase-admin/messaging');
const Anthropic                = require('@anthropic-ai/sdk');

// ── analyzeWithClaude ─────────────────────────────────────────────────────────
// Callable function that proxies image and session analysis to Claude.
// mode = 'image'   → base64Image + exercise + focusGoal → English coaching text
// mode = 'session' → exercise + reps + duration + formScore → Hebrew summary

const anthropicKey = defineSecret('ANTHROPIC_API_KEY');

const EXERCISE_PROMPTS = {
  pushups: 'The user is performing push-ups. Analyze: hand placement width, body alignment (straight line head to heels), core engagement, elbow angle and flare at the bottom, neck position, and hip sag.',
  pullups: 'The user is performing pull-ups. Analyze: grip width and type, shoulder blade engagement (scapular retraction), chin height relative to bar, body swing or kipping, and lat activation.',
  dips:    'The user is performing dips. Analyze: elbow flare, forward lean angle (chest dips vs tricep dips), shoulder depression and stability, wrist alignment, and depth of the movement.',
  squats:  'The user is performing squats. Analyze: knee tracking over toes, squat depth, spine neutrality and back angle, foot stance width and toe angle, heel contact with ground, and chest position.',
  boxing:  'The user is performing boxing or Muay Thai. Analyze: stance width and weight distribution, guard position and chin tuck, shoulder protection, hip rotation and power generation, and overall defensive posture.',
};

const GOAL_CONTEXT = {
  fitness:  'Focus on exercise form, muscle engagement, body alignment, and movement technique.',
  trading:  'Focus on desk ergonomics, sitting posture, and eye-level for a productive trading session.',
  work:     'Focus on desk posture, shoulder position, screen distance, and workspace ergonomics.',
  mindful:  'Focus on meditation posture, body alignment, breathing position, and relaxed but upright form.',
  learning: 'Focus on study posture, head position, and desk setup for sustained focus.',
  creative: 'Focus on body posture, arm position, and workspace setup for creative flow.',
};

const EXERCISE_NAMES_HE = {
  pushups: 'שכיבות שמיכה',
  pullups: 'מתח',
  dips:    'מקבילים',
  squats:  'סקוואטים',
  boxing:  'אגרוף / מואי תאי',
};

exports.analyzeWithClaude = onCall(
  {
    secrets:        [anthropicKey],
    region:         'europe-west1',
    memory:         '512MiB',
    timeoutSeconds: 60,
    cors:           true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }

    const client = new Anthropic({ apiKey: anthropicKey.value() });
    const { mode, exercise, focusGoal, base64Image, reps, duration, formScore } = request.data;

    // ── Image analysis ──────────────────────────────────────────────────────
    if (mode === 'image') {
      if (!base64Image) throw new HttpsError('invalid-argument', 'base64Image required for image mode.');
      const context = exercise
        ? (EXERCISE_PROMPTS[exercise] || '')
        : (GOAL_CONTEXT[focusGoal]   || 'Analyze posture, form, and body alignment.');

      const message = await client.messages.create({
        model:      'claude-opus-4-7',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            {
              type:   'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
            },
            {
              type: 'text',
              text: `You are an expert fitness and biomechanics coach. ${context} ` +
                    `Look at this image carefully and give specific, actionable coaching feedback. ` +
                    `Be encouraging but precise. Keep your response to 2–4 sentences. Plain text only, no markdown.`,
            },
          ],
        }],
      });
      return { text: message.content[0].text };
    }

    // ── Session analysis (Hebrew) ───────────────────────────────────────────
    if (mode === 'session') {
      const name     = EXERCISE_NAMES_HE[exercise] || exercise;
      const repLabel = exercise === 'boxing' ? 'אגרופים' : 'חזרות';

      const message = await client.messages.create({
        model:      'claude-opus-4-7',
        max_tokens: 400,
        messages: [{
          role:    'user',
          content: `אתה מאמן כושר ובמיומינות ביומכניקה מנוסה. המשתמש סיים סשן אימון עם ניתוח AI בזמן אמת:\n` +
                   `תרגיל: ${name}\n` +
                   `משך: ${duration} שניות\n` +
                   `${repLabel}: ${reps}\n` +
                   `ציון נוכחות בפריים (איכות זיהוי): ${formScore}/100\n\n` +
                   `כתוב משוב מאמן בעברית בלבד. 3-4 משפטים. היה מעודד וספציפי. ` +
                   `ציין מה הלך טוב ו-1-2 נקודות לשיפור על סמך הנתונים. טקסט רגיל בלבד, ללא markdown.`,
        }],
      });
      return { text: message.content[0].text };
    }

    throw new HttpsError('invalid-argument', 'Invalid mode. Use "image" or "session".');
  }
);

initializeApp();

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
  if (streak.lastPostDate === today) return true;

  const quests = userData[`dailyQuests_${today}`] || {};
  if (quests.pushup && quests.monkMode && quests.quickReview) return true;

  return false;
}

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
