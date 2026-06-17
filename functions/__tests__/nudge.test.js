'use strict';

// Pure-logic tests — no Firebase SDK required.
// We extract the helper functions by re-implementing them here so this
// test file has zero dependencies and runs instantly.

// ── Helpers under test (copied from index.js to keep tests dependency-free) ──

function todayIsraelDateKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(now);
}

function isCompletedToday(userData, today) {
  const streak = userData.streak || {};
  if (streak.lastPostDate === today) return true;
  const quests = userData[`dailyQuests_${today}`] || {};
  if (quests.pushup && quests.monkMode && quests.quickReview) return true;
  return false;
}

const NUDGE_COPY = {
  he: [
    { title: 'ה-Streak שלך בסכנה! 🔥', body: 'נשאר לך עוד קצת...' },
    { title: 'אל תוותר לעצמך היום ⚔️', body: 'כנס לסמן את ההרגלים שלך עכשיו.' },
    { title: 'מצב מונק מוד מופעל? 🧠', body: 'אל תפיל את הרצף, המשימות מחכות לך.' },
  ],
  en: [
    { title: 'Your streak is at risk! 🔥', body: "Close today 1% better." },
    { title: "Don't quit on yourself today ⚔️", body: 'Check in and mark your habits now.' },
    { title: 'Monk Mode activated? 🧠', body: "Don't break the streak." },
  ],
  ar: [
    { title: 'سلسلتك في خطر! 🔥', body: 'أكمل يومك الآن.' },
    { title: 'لا تتخلى عن نفسك اليوم ⚔️', body: 'سجّل عاداتك وأغلق يومك.' },
    { title: 'وضع الرهبان مفعّل؟ 🧠', body: 'لا تكسر السلسلة.' },
  ],
};

function pickCopy(lang) {
  const pool = NUDGE_COPY[lang] || NUDGE_COPY.he;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('todayIsraelDateKey', () => {
  it('returns a YYYY-MM-DD string', () => {
    const key = todayIsraelDateKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uses Israel timezone (UTC+2/+3), not UTC', () => {
    // At 23:30 UTC (which is 01:30 Israel next day), the Israel date is different from UTC.
    const utcMidnight = new Date('2024-03-15T23:30:00Z');
    const israelKey   = todayIsraelDateKey(utcMidnight);
    const utcKey      = utcMidnight.toISOString().split('T')[0];
    // Israel date should be 2024-03-16 (next day), UTC date is 2024-03-15
    expect(israelKey).toBe('2024-03-16');
    expect(utcKey).toBe('2024-03-15');
  });
});

describe('isCompletedToday', () => {
  const TODAY = '2024-06-10';

  it('returns true when streak.lastPostDate === today', () => {
    expect(isCompletedToday({ streak: { lastPostDate: TODAY } }, TODAY)).toBe(true);
  });

  it('returns false when streak.lastPostDate is yesterday', () => {
    expect(isCompletedToday({ streak: { lastPostDate: '2024-06-09' } }, TODAY)).toBe(false);
  });

  it('returns true when all 3 daily quests are complete', () => {
    const userData = {
      streak: { lastPostDate: '2024-06-09' },
      [`dailyQuests_${TODAY}`]: { pushup: true, monkMode: true, quickReview: true },
    };
    expect(isCompletedToday(userData, TODAY)).toBe(true);
  });

  it('returns false when only some quests complete', () => {
    const userData = {
      [`dailyQuests_${TODAY}`]: { pushup: true, monkMode: false, quickReview: true },
    };
    expect(isCompletedToday(userData, TODAY)).toBe(false);
  });

  it('returns false for empty user doc', () => {
    expect(isCompletedToday({}, TODAY)).toBe(false);
  });

  it('returns false when no streak and no quests', () => {
    expect(isCompletedToday({ name: 'test', fcmToken: 'abc' }, TODAY)).toBe(false);
  });
});

describe('pickCopy', () => {
  it('returns Hebrew copy for "he"', () => {
    const copy = pickCopy('he');
    expect(NUDGE_COPY.he).toContainEqual(copy);
  });

  it('returns English copy for "en"', () => {
    const copy = pickCopy('en');
    expect(NUDGE_COPY.en).toContainEqual(copy);
  });

  it('falls back to Hebrew for unknown lang', () => {
    const copy = pickCopy('jp');
    expect(NUDGE_COPY.he).toContainEqual(copy);
  });

  it('copy has non-empty title and body', () => {
    for (const lang of ['he', 'en', 'ar']) {
      for (const copy of NUDGE_COPY[lang]) {
        expect(copy.title.length).toBeGreaterThan(0);
        expect(copy.body.length).toBeGreaterThan(0);
      }
    }
  });

  it('produces all 3 variants across many calls (not stuck on one)', () => {
    const seen = new Set();
    for (let i = 0; i < 300; i++) seen.add(pickCopy('he').title);
    expect(seen.size).toBe(3);
  });
});

// ── accountabilityReminder helpers ────────────────────────────────────────────

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

function buildAccountabilityMessages(users) {
  const messages   = [];
  const tokenToUid = new Map();

  for (const { uid, data: d } of users) {
    const apps = Array.isArray(d.accountabilityApps) ? d.accountabilityApps : [];
    if (!d.isPro || apps.length === 0) continue;

    const tokenSet = new Set(Array.isArray(d.fcmTokens) ? d.fcmTokens : []);
    if (d.fcmToken) tokenSet.add(d.fcmToken);
    if (!tokenSet.size) continue;

    const lang    = d.lang || 'en';
    const appName = apps[0];
    const copy    = (ACCOUNTABILITY_COPY[lang] || ACCOUNTABILITY_COPY.en)(appName);

    for (const token of tokenSet) {
      tokenToUid.set(token, uid);
      messages.push({ token, copy });
    }
  }
  return { messages, tokenToUid };
}

describe('accountabilityReminder message builder', () => {
  it('skips non-PRO users', () => {
    const { messages } = buildAccountabilityMessages([
      { uid: 'u1', data: { isPro: false, accountabilityApps: ['TikTok'], fcmTokens: ['tok1'] } },
    ]);
    expect(messages).toHaveLength(0);
  });

  it('skips PRO users with no accountability apps', () => {
    const { messages } = buildAccountabilityMessages([
      { uid: 'u2', data: { isPro: true, accountabilityApps: [], fcmTokens: ['tok2'] } },
    ]);
    expect(messages).toHaveLength(0);
  });

  it('skips PRO users with no FCM tokens', () => {
    const { messages } = buildAccountabilityMessages([
      { uid: 'u3', data: { isPro: true, accountabilityApps: ['Instagram'], fcmTokens: [] } },
    ]);
    expect(messages).toHaveLength(0);
  });

  it('builds message for PRO user with app + token', () => {
    const { messages } = buildAccountabilityMessages([
      { uid: 'u4', data: { isPro: true, accountabilityApps: ['TikTok'], fcmTokens: ['tok4'], lang: 'en' } },
    ]);
    expect(messages).toHaveLength(1);
    expect(messages[0].copy.title).toContain('TikTok');
    expect(messages[0].copy.lang).toBe('en');
  });

  it('uses first app in list for the notification', () => {
    const { messages } = buildAccountabilityMessages([
      { uid: 'u5', data: { isPro: true, accountabilityApps: ['TikTok', 'Instagram'], fcmTokens: ['tok5'], lang: 'he' } },
    ]);
    expect(messages[0].copy.title).toContain('TikTok');
    expect(messages[0].copy.title).not.toContain('Instagram');
  });

  it('sends Hebrew copy for lang=he', () => {
    const { messages } = buildAccountabilityMessages([
      { uid: 'u6', data: { isPro: true, accountabilityApps: ['YouTube'], fcmTokens: ['tok6'], lang: 'he' } },
    ]);
    expect(messages[0].copy.lang).toBe('he');
    expect(messages[0].copy.title).toContain('YouTube');
  });

  it('falls back to English for unknown lang', () => {
    const { messages } = buildAccountabilityMessages([
      { uid: 'u7', data: { isPro: true, accountabilityApps: ['Reddit'], fcmTokens: ['tok7'], lang: 'jp' } },
    ]);
    expect(messages[0].copy.lang).toBe('en');
  });

  it('deduplicates tokens from fcmToken scalar + fcmTokens array', () => {
    const { messages } = buildAccountabilityMessages([
      { uid: 'u8', data: {
        isPro: true, accountabilityApps: ['X'],
        fcmToken: 'same-tok', fcmTokens: ['same-tok', 'other-tok'], lang: 'en',
      }},
    ]);
    expect(messages).toHaveLength(2); // 'same-tok' deduped, 'other-tok' added
    const tokens = messages.map(m => m.token);
    expect(new Set(tokens).size).toBe(2);
  });

  it('handles multiple users correctly', () => {
    const users = [
      { uid: 'a', data: { isPro: true,  accountabilityApps: ['TikTok'],    fcmTokens: ['t1'], lang: 'en' } },
      { uid: 'b', data: { isPro: false, accountabilityApps: ['Instagram'], fcmTokens: ['t2'], lang: 'he' } },
      { uid: 'c', data: { isPro: true,  accountabilityApps: [],            fcmTokens: ['t3'], lang: 'ar' } },
      { uid: 'd', data: { isPro: true,  accountabilityApps: ['YouTube'],   fcmTokens: ['t4'], lang: 'ar' } },
    ];
    const { messages } = buildAccountabilityMessages(users);
    expect(messages).toHaveLength(2); // only a and d qualify
    expect(messages.map(m => m.token)).toEqual(['t1', 't4']);
  });
});
