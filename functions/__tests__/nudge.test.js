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
