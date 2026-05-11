// ═══════════════════════════════════════════════════════════════
// 1% Better — AI Coach Cloud Function
//
// Generates a personalized weekly review for a signed-in user.
// Triggered by the client via httpsCallable('generateWeeklyReview').
//
// Inputs (from client):
//   weekId:  "YYYY-MM-DD"   — Monday (local) of the week to summarize.
//   lang:    "en"|"he"|...  — user's UI language; review is written in this language.
//
// Reads (from Firestore, server-side, with admin privileges):
//   users/{uid}/activity/*  — last 7 days
//   posts where uid==caller, orderBy createdAt desc, limit 5
//
// Writes:
//   users/{uid}/aiReviews/{weekId}  — { text, model, createdAt, lang, weekId }
//
// Returns the review document so the client doesn't have to round-trip
// to Firestore on the same call.
//
// Deploy:
//   firebase functions:secrets:set ANTHROPIC_API_KEY   # one-time
//   firebase deploy --only functions
// ═══════════════════════════════════════════════════════════════

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }       = require('firebase-functions/params');
const admin                  = require('firebase-admin');
const Anthropic              = require('@anthropic-ai/sdk');

admin.initializeApp();
const db = admin.firestore();

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const MODEL_ID = 'claude-haiku-4-5';   // fast + cheap; quality is fine for short coaching prose
const MAX_TOKENS = 500;

const SUPPORTED_LANGS = ['en', 'he', 'es', 'fr', 'ar', 'ru', 'pt'];

// ── helpers ───────────────────────────────────────────────────────
function isValidWeekId(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function dayDiff(a, b) {
  const da = new Date(a + 'T00:00:00Z');
  const db = new Date(b + 'T00:00:00Z');
  return Math.round((db - da) / 86400000);
}

// Build the prompt context from raw Firestore docs. Cheap, deterministic
// — kept out of the model call so it's easy to unit-test if needed.
function buildContext(activityDocs, postDocs, weekId) {
  const activity = [];
  activityDocs.forEach(doc => {
    const d = doc.data();
    // Only include days within the 7-day window ending at weekId+6.
    const offset = dayDiff(weekId, doc.id);
    if (offset >= 0 && offset <= 6) {
      activity.push({ date: doc.id, done: d.done || 0, xp: d.xp || 0 });
    }
  });
  activity.sort((a, b) => a.date.localeCompare(b.date));

  const posts = postDocs.map(doc => {
    const d = doc.data();
    return {
      date: d.createdAt && d.createdAt.toDate
              ? d.createdAt.toDate().toISOString().slice(0, 10)
              : '',
      group:   d.groupName  || d.groupId || '',
      caption: (d.caption || '').slice(0, 300),
    };
  });

  return { activity, posts };
}

function systemPromptFor(lang) {
  const langName = {
    en: 'English', he: 'Hebrew', es: 'Spanish', fr: 'French',
    ar: 'Arabic',  ru: 'Russian', pt: 'Portuguese',
  }[lang] || 'English';

  return [
    "You are the AI coach for \"1% Better\", a habit-tracking app whose core idea is",
    "consistency over perfection — small daily wins compound into long-term change.",
    "",
    "You will be given one user's last 7 days of activity log and their last 5 proof-",
    "post captions. Write a short personalized weekly review for them.",
    "",
    "Requirements:",
    `- Write the entire response in ${langName}.`,
    "- 3 short paragraphs, max ~120 words total.",
    "  1) One sentence acknowledging a specific pattern you see in their data",
    "     (e.g. \"You hit 5 of 7 days this week\", \"You doubled down on running\").",
    "  2) One concrete observation about what's working — refer to their actual",
    "     captions or group names where possible.",
    "  3) One specific, actionable suggestion for the coming week. Avoid generic",
    "     advice; ground it in the data you were given.",
    "- Warm but direct. No filler, no \"as an AI...\", no markdown headings.",
    "- If the data is sparse (e.g. 0-1 active days), be encouraging but honest:",
    "  point out the gap and suggest one tiny next step.",
    "- Output plain text only. No JSON, no XML, no code fences.",
  ].join('\n');
}

function userPromptFor(ctx, weekId, lang) {
  const totalDone = ctx.activity.reduce((s, a) => s + a.done, 0);
  const totalXP   = ctx.activity.reduce((s, a) => s + a.xp,   0);
  const activeDays = ctx.activity.filter(a => a.done > 0).length;

  const lines = [];
  lines.push(`Week starting (local Monday): ${weekId}`);
  lines.push(`Language: ${lang}`);
  lines.push('');
  lines.push(`Activity summary: ${activeDays}/7 active days, ${totalDone} tasks completed, ${totalXP} XP earned.`);
  lines.push('Daily breakdown (date, tasks_done, xp):');
  if (ctx.activity.length === 0) {
    lines.push('  (no activity logged this week)');
  } else {
    ctx.activity.forEach(a => lines.push(`  ${a.date}  done=${a.done}  xp=${a.xp}`));
  }
  lines.push('');
  lines.push('Last 5 proof-post captions (most recent first):');
  if (ctx.posts.length === 0) {
    lines.push('  (no proof posts on record)');
  } else {
    ctx.posts.forEach(p => {
      const where = p.group ? ` [${p.group}]` : '';
      const when  = p.date  ? ` (${p.date})`  : '';
      lines.push(`  -${when}${where} ${p.caption}`);
    });
  }
  lines.push('');
  lines.push("Write the weekly review now.");
  return lines.join('\n');
}

// ── callable ──────────────────────────────────────────────────────
exports.generateWeeklyReview = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    region:  'us-central1',
    cors:    true,
    timeoutSeconds: 30,
    memory:  '256MiB',
  },
  async (request) => {
    const uid = request.auth && request.auth.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Sign-in required.');
    }
    const weekId = (request.data && request.data.weekId) || '';
    const lang   = (request.data && request.data.lang)   || 'en';
    if (!isValidWeekId(weekId)) {
      throw new HttpsError('invalid-argument', 'weekId must be YYYY-MM-DD.');
    }
    if (!SUPPORTED_LANGS.includes(lang)) {
      throw new HttpsError('invalid-argument', 'Unsupported language.');
    }

    // Idempotency: if a review for this week already exists, return it
    // unchanged rather than burning another model call.
    const reviewRef = db.collection('users').doc(uid)
                       .collection('aiReviews').doc(weekId);
    const existing  = await reviewRef.get();
    if (existing.exists) return { cached: true, ...existing.data() };

    // Gather context server-side. We trust Firestore here, not the client.
    const [activitySnap, postsSnap] = await Promise.all([
      db.collection('users').doc(uid).collection('activity').get(),
      db.collection('posts')
        .where('uid', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get()
        .catch(() => ({ docs: [] })),  // ok if no posts yet or composite index missing
    ]);

    const ctx = buildContext(activitySnap.docs, postsSnap.docs, weekId);

    // Call Claude.
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    let reviewText;
    try {
      const resp = await client.messages.create({
        model:      MODEL_ID,
        max_tokens: MAX_TOKENS,
        system:     systemPromptFor(lang),
        messages: [
          { role: 'user', content: userPromptFor(ctx, weekId, lang) },
        ],
      });
      const block = resp.content.find(b => b.type === 'text');
      reviewText  = block ? block.text.trim() : '';
      if (!reviewText) throw new Error('Empty completion');
    } catch (err) {
      console.error('[generateWeeklyReview] Claude call failed:', err);
      throw new HttpsError('internal', 'AI coach is unavailable right now.');
    }

    const doc = {
      text:      reviewText,
      lang,
      weekId,
      model:     MODEL_ID,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await reviewRef.set(doc);
    return { cached: false, ...doc, createdAt: new Date().toISOString() };
  }
);
