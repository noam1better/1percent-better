'use strict';

const { onSchedule }   = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore }  = require('firebase-admin/firestore');
const { getMessaging }  = require('firebase-admin/messaging');

initializeApp();

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

    // Purge stale tokens so next run doesn't retry dead registrations
    if (staleTokens.size) {
      const affectedUids = new Set(
        [...staleTokens].map(t => tokenToUid.get(t)).filter(Boolean)
      );
      for (const uid of affectedUids) {
        const ref  = db.collection('users').doc(uid);
        const snap = await ref.get();
        if (!snap.exists) continue;
        const { fcmTokens = [], fcmToken } = snap.data();
        const clean = fcmTokens.filter(t => !staleTokens.has(t));
        const update = { fcmTokens: clean };
        if (fcmToken && staleTokens.has(fcmToken)) {
          update.fcmToken = clean.at(-1) ?? '';
        }
        await ref.update(update);
      }
      console.log(`[dailyHabitNudge] purged ${staleTokens.size} stale tokens from ${affectedUids.size} users`);
    }

    console.log(`[dailyHabitNudge] ${today}: sent=${sent} failed=${failed} stale_cleaned=${staleTokens.size} total_eligible=${messages.length}`);
  }
);
