/**
 * Translation key-parity and correctness tests.
 * Extracts TRANSLATIONS from index.html using vm.runInNewContext so no
 * DOM or globals are needed — safe in Node.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let TRANSLATIONS;

beforeAll(() => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

  // Slice out exactly the TRANSLATIONS const (ends just before `let currentLang`)
  const start = html.indexOf('const TRANSLATIONS = {');
  const end   = html.indexOf('\nlet currentLang =', start);
  if (start === -1 || end === -1) throw new Error('Could not locate TRANSLATIONS in index.html');

  // vm.runInNewContext only exposes `var` declarations to the sandbox,
  // not `const`/`let`. Swap the prefix so TRANSLATIONS lands on ctx.
  const objStr = html.slice(start + 'const TRANSLATIONS = '.length, end)
    .trimEnd().replace(/;$/, '');
  const ctx = {};
  vm.runInNewContext(`var TRANSLATIONS = ${objStr};`, ctx);
  TRANSLATIONS = ctx.TRANSLATIONS;
});

// ── Language map ──────────────────────────────────────────────────────────────

describe('TRANSLATIONS structure', () => {
  it('contains expected language codes', () => {
    const langs = Object.keys(TRANSLATIONS);
    expect(langs).toContain('en');
    expect(langs).toContain('he');
    expect(langs).toContain('es');
    expect(langs).toContain('fr');
    expect(langs).toContain('ar');
    expect(langs).toContain('ru');
    expect(langs).toContain('pt');
  });

  it('en has ltr direction', () => {
    expect(TRANSLATIONS.en.dir).toBe('ltr');
  });

  it('he has rtl direction', () => {
    expect(TRANSLATIONS.he.dir).toBe('rtl');
  });

  it('ar has rtl direction', () => {
    expect(TRANSLATIONS.ar.dir).toBe('rtl');
  });

  it('es, fr, ru, pt have ltr direction', () => {
    for (const lang of ['es', 'fr', 'ru', 'pt']) {
      expect(TRANSLATIONS[lang].dir, `${lang}.dir`).toBe('ltr');
    }
  });
});

// ── en integrity ──────────────────────────────────────────────────────────────

describe('en translation integrity', () => {
  const REQUIRED_KEYS = [
    // Nav
    'nav-hub-label', 'nav-upload-label', 'nav-feed-label',
    'nav-profile-label', 'nav-settings-label', 'nav-history-label',
    // Auth / guest
    'guest-btn', 'guestBanner',
    // Hub
    'hub-hero-title', 'hub-hero-sub', 'lbl-streak-hero',
    'lbl-today-goal', 'lbl-upload-proof-btn',
    // Settings
    'lbl-appearance', 'lbl-dark', 'lbl-light', 'lbl-language',
    'lbl-display-name', 'saveProfileBtn',
    'lbl-notifications', 'lbl-daily-reminder',
    'lbl-danger', 'lbl-reset',
    // Workout
    'workoutHint',
    // RPG block
    'rpg-lbl-streak', 'rpg-sub-streak',
    'rpg-lbl-weekly', 'rpg-sub-weekly',
    'rpg-lbl-combo',  'rpg-sub-combo',
    'rpg-lbl-quest',
    // Daily challenge
    'lbl-daily-challenge-badge',
    // Install
    'installTitle', 'openInstallGuidanceLabel',
    // Celebration
    'celebTitle', 'celebSub',
    // PRO screen
    'pro-hero-sub', 'pro-feat-label',
    'pro-feat-1-title', 'pro-feat-2-title',
    'pro-social-proof', 'pro-back-btn',
    // History
    'lbl-hist-title', 'lbl-hist-sub',
  ];

  it('has all required keys', () => {
    for (const key of REQUIRED_KEYS) {
      expect(TRANSLATIONS.en, `en missing key "${key}"`).toHaveProperty(key);
    }
  });

  it('no required key maps to an empty string', () => {
    const empties = REQUIRED_KEYS.filter(k => TRANSLATIONS.en[k] === '');
    expect(empties).toHaveLength(0);
  });

  it('all values are strings', () => {
    const nonStrings = Object.entries(TRANSLATIONS.en)
      .filter(([k, v]) => k !== 'dir' && typeof v !== 'string');
    expect(nonStrings).toHaveLength(0);
  });
});

// ── Hebrew key parity ─────────────────────────────────────────────────────────

describe('he translation key parity with en', () => {
  it('he has all keys present in en', () => {
    const enKeys = Object.keys(TRANSLATIONS.en).filter(k => k !== 'dir');
    const missing = enKeys.filter(k => !(k in TRANSLATIONS.he));
    expect(
      missing,
      `he is missing ${missing.length} key(s): ${missing.join(', ')}`,
    ).toHaveLength(0);
  });

  it('he has no empty-string values for keys that en has non-empty', () => {
    const enKeys = Object.keys(TRANSLATIONS.en).filter(k => k !== 'dir');
    const broken = enKeys.filter(
      k => TRANSLATIONS.en[k] !== '' && TRANSLATIONS.he[k] === '',
    );
    expect(broken, `he has empty values for: ${broken.join(', ')}`).toHaveLength(0);
  });
});

// ── Partial-language core keys ────────────────────────────────────────────────

describe('partial languages (es, fr, ar, ru, pt) cover core settings keys', () => {
  const CORE_KEYS = [
    'lbl-appearance', 'lbl-dark', 'lbl-light', 'lbl-language',
    'saveProfileBtn', 'lbl-notifications', 'nav-settings-label',
    'hub-hero-title', 'daily-quests-title',
  ];

  for (const lang of ['es', 'fr', 'ar', 'ru', 'pt']) {
    it(`${lang} has core settings keys`, () => {
      for (const key of CORE_KEYS) {
        expect(TRANSLATIONS[lang], `${lang} missing "${key}"`).toHaveProperty(key);
        expect(TRANSLATIONS[lang][key]).toBeTruthy();
      }
    });
  }
});
