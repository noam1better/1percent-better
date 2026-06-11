import { useEffect, useState } from 'react'
import './DynamicWebsitePage.css'

// ── Business type configurations ────────────────────────────────────
const BIZ_CONFIGS = {
  flooring: {
    layout: 'hero',
    heroTag: 'מלאכת יד · חומרים שמספרים סיפור',
    headline: name => name || 'רצפה שמגדירה מרחב',
    subline: biz =>
      `פרקט הוא לא רק משטח — הוא הרגש של הבית. כל לוח נבחר ביד, כל פרט מושלם${biz.city ? ` ב${biz.city}` : ''}.`,
    cta: 'קבלו הצעת מחיר חינמית',
    services: [
      { icon: '🪵', title: 'פרקט מהנד', desc: 'מגוון עצים טבעיים לכל סגנון ותקציב' },
      { icon: '🔧', title: 'התקנה מקצועית', desc: 'צוות מנוסה עם אחריות 10 שנים' },
      { icon: '🏗️', title: 'ריצוף ושיש', desc: 'פורצלן, קרמיקה ושיש מיובא' },
      { icon: '📐', title: 'ייעוץ ומדידה', desc: 'ביקור בית חינמי — הצעת מחיר מפורטת' },
    ],
    testimonials: [
      { name: 'רחל כהן', text: 'עבודה מדהימה! הפרקט נראה פנטסטי ועמד בלוח הזמנים.', stars: 5 },
      { name: 'יוסי לוי', text: 'מקצועיות ברמה אחרת. ממליץ בחום לכל אחד.', stars: 5 },
      { name: 'מיכל אברהם', text: 'מחיר הוגן, עבודה נקייה ותוצאה מושלמת.', stars: 5 },
    ],
    accent: '#d97706',
    emoji: '🪵',
    badges: ['⭐ 500+ לקוחות מרוצים', '🔧 אחריות 10 שנה', '📞 מענה תוך שעה'],
    copy: {
      servicesEyebrow: 'מה שאנחנו עושים',
      servicesH2: 'שירות מלא מהייעוץ עד ההתקנה',
      whyEyebrow: 'למה לבחור בנו',
      whyH2: 'איכות שמדברת בעד עצמה',
      reviewsEyebrow: 'לקוחות שממליצים',
      reviewsH2: 'הם כבר בחרו בנו',
    },
    heading: { weight: 800, spacing: '-1.5px' },
  },
  restaurant: {
    layout: 'hero',
    heroTag: 'בישול מאהבה · טעמים שחוזרים',
    headline: name => name || 'ארוחה שלא שוכחים',
    subline: biz =>
      `כל מנה מספרת סיפור. כל ביס מחזיר לרגע${biz.city ? ` — ב${biz.city}` : ''}. אוכל אמיתי, עשוי מאהבה, מוגש בלב.`,
    cta: 'הזמינו מקום עכשיו',
    services: [
      { icon: '🥩', title: 'מנות בשר', desc: 'בשר טרי מהגריל — ישר לצלחת' },
      { icon: '🥗', title: 'סלטים ביתיים', desc: 'ירקות טריים, רטבים ביתיים' },
      { icon: '🍕', title: 'פיצות ומאפים', desc: 'בצק ביתי, רוטב עגבניות טרי' },
      { icon: '🎂', title: 'קינוחים', desc: 'מתוקים שמכינים בעצמנו כל יום' },
    ],
    testimonials: [
      { name: 'אבי שלום', text: 'המקום הכי טעים בעיר. בא כאן כל שבוע עם המשפחה.', stars: 5 },
      { name: 'נועה מזרחי', text: 'השירות מעולה, האוכל פנומנלי. מומלץ בחום!', stars: 5 },
      { name: 'גל ברק', text: 'ארוחת ערב רומנטית מושלמת. תודה על החוויה!', stars: 5 },
    ],
    accent: '#dc2626',
    emoji: '🍽️',
    badges: ['⭐ 4.9 בגוגל', '🍽️ מעל 200 מנות', '📞 הזמנות עד 22:00'],
    copy: {
      servicesEyebrow: 'מה בתפריט שלנו',
      servicesH2: 'טעמים שחוזרים אליהם',
      whyEyebrow: 'מה שמייחד אותנו',
      whyH2: 'לא רשת — בית אמיתי',
      reviewsEyebrow: 'אורחים קבועים',
      reviewsH2: 'הטעם מדבר',
    },
    heading: { weight: 800, spacing: '-1px' },
  },
  beauty: {
    layout: 'luxe',
    heroTag: 'טקס · יוקרה · את',
    headline: name => name || 'כי מגיע לך הכי טוב',
    subline: biz =>
      `לא סתם טיפול — חוויה שלמה${biz.city ? ` ב${biz.city}` : ''}. שעה שהיא כולה שלך, בידיים שיודעות מה היופי שלך.`,
    cta: 'הזמינו תור עכשיו',
    services: [
      { icon: '💅', title: 'מניקור ופדיקור', desc: 'ג\'ל, אקריל — עם מוצרים מקצועיים' },
      { icon: '✨', title: 'טיפולי פנים', desc: 'ניקוי, הלבנה, הידרציה ואנטי-אייג\'ינג' },
      { icon: '💆', title: 'מסאז\'', desc: 'שוודי, רקמות עמוק, ארומתרפי' },
      { icon: '🎨', title: 'איפור מקצועי', desc: 'לאירועים, חתונות ויום יום' },
    ],
    testimonials: [
      { name: 'שירה פרץ', text: 'המכון הכי מקצועי שהייתי בו. יוצאת מפנקת כל פעם!', stars: 5 },
      { name: 'דנה גולן', text: 'מניקור מושלם ושירות חם ואישי. חוזרת שוב ושוב.', stars: 5 },
      { name: 'לי אלון', text: 'הטיפול הכי טוב שקיבלתי אי פעם. מומלץ בחום!', stars: 5 },
    ],
    accent: '#db2777',
    emoji: '💅',
    badges: ['💅 500+ לקוחות מרוצות', '⭐ 5 כוכבים', '📱 הזמנה קלה'],
    copy: {
      servicesEyebrow: 'הטיפולים שלנו',
      servicesH2: 'כי מגיע לכן הכי טוב',
      whyEyebrow: 'המחויבות שלנו',
      whyH2: 'לכל לקוחה — חוויה אישית',
      reviewsEyebrow: 'לקוחות שחוזרות',
      reviewsH2: 'חוויות אמיתיות',
    },
    heading: { weight: 300, spacing: '0.5px' },
  },
  lawyer: {
    layout: 'pro',
    heroTag: 'סמכות · דיוק · תוצאות',
    headline: name => name ? `משרד עו"ד ${name}` : 'הגנה משפטית שמנצחת',
    subline: biz =>
      `כשיש הרבה על הכף — בחרו את מי שניצח כבר${biz.city ? ` ב${biz.city}` : ''}. ניסיון מוכח, שקיפות מלאה, תוצאות אמיתיות.`,
    cta: 'קבלו ייעוץ ראשוני חינמי',
    services: [
      { icon: '🏠', title: 'נדל"ן ומקרקעין', desc: 'רכישה, מכירה, שכירות — ליווי מלא' },
      { icon: '💼', title: 'דיני עבודה', desc: 'פיטורים, חוזים, הסכמי שכר' },
      { icon: '👨‍👩‍👧', title: 'דיני משפחה', desc: 'גירושין, מזונות, הסכמי ממון' },
      { icon: '🏢', title: 'עסקי וחברות', desc: 'הקמת חברות, חוזים, ייפוי כוח' },
    ],
    testimonials: [
      { name: 'אורן לוי', text: 'ייצוג מעולה בעסקת נדל"ן מורכבת. מקצועי ואמין לחלוטין.', stars: 5 },
      { name: 'רותי כהן', text: 'עזר לי בדיני עבודה בצורה מושלמת. מומלץ בחום.', stars: 5 },
      { name: 'דוד מזרחי', text: 'זמין, מקצועי ועם תשובות לכל שאלה. תודה רבה!', stars: 5 },
    ],
    accent: '#1d4ed8',
    emoji: '⚖️',
    badges: ['⚖️ 20+ שנות ניסיון', '✅ אלפי תיקים', '📞 ייעוץ ראשוני חינם'],
    copy: {
      servicesEyebrow: 'תחומי הפרקטיקה',
      servicesH2: 'ייצוג משפטי מקיף',
      whyEyebrow: 'הגישה שלנו',
      whyH2: 'אמינות, שקיפות, תוצאות',
      reviewsEyebrow: 'לקוחות ממליצים',
      reviewsH2: 'ייצגנו אותם בהצלחה',
    },
    heading: { weight: 700, spacing: '-0.5px' },
  },
  gym: {
    layout: 'hero',
    heroTag: 'STRONGER · HARDER · UNSTOPPABLE',
    headline: name => name || 'TRANSFORM.',
    subline: biz =>
      `אין גבולות — רק גבולות שקבעתם לעצמכם${biz.city ? ` · ${biz.city}` : ''}. אנחנו כאן כדי לשבור אותם.`,
    cta: 'הצטרפו עכשיו — שבוע ניסיון חינם',
    services: [
      { icon: '🏋️', title: 'חדר כוח', desc: 'ציוד חדיש, משקלים חופשיים, מכשירים מקצועיים' },
      { icon: '🧘', title: 'שיעורי סטודיו', desc: 'יוגה, פילאטיס, זומבה — כל יום' },
      { icon: '👟', title: 'קרדיו', desc: 'הליכונים, אופניים, אליפסה מתקדמים' },
      { icon: '👨‍🏫', title: 'אימון אישי', desc: 'מאמן מוסמך — תוכנית מותאמת אישית' },
    ],
    testimonials: [
      { name: 'תומר גל', text: 'ירדתי 15 ק"ג ב-4 חודשים. המאמנים פנטסטיים!', stars: 5 },
      { name: 'ליאור שחר', text: 'הציוד הטוב ביותר שראיתי. האווירה מדהימה.', stars: 5 },
      { name: 'רועי אמיר', text: 'השבוע הניסיון שכנע אותי להישאר שנה שלמה. ממליץ!', stars: 5 },
    ],
    accent: '#ea580c',
    emoji: '💪',
    badges: ['💪 1000+ חברים', '🏆 מאמנים מוסמכים', '⚡ פתוח 6:00–24:00'],
    copy: {
      servicesEyebrow: 'האימונים שלנו',
      servicesH2: 'תוצאות שמדברות בעד עצמן',
      whyEyebrow: 'למה אנחנו שונים',
      whyH2: 'לא חדר כושר — קהילה',
      reviewsEyebrow: 'החברים שלנו',
      reviewsH2: 'השינוי שהם עברו',
    },
    heading: { weight: 900, spacing: '-2px' },
  },
  accounting: {
    layout: 'pro',
    heroTag: 'דיוק · חיסכון · שקט נפשי',
    headline: name => name ? `רו"ח ${name}` : 'כסף שעובד בשבילכם',
    subline: biz =>
      `לא מספיק להרוויח — צריך לשמור${biz.city ? ` · ${biz.city}` : ''}. ניהול פיננסי חכם שמוצא את הכסף הנסתר בעסק שלכם.`,
    cta: 'קבלו ייעוץ ראשוני',
    services: [
      { icon: '📚', title: 'הנהלת חשבונות', desc: 'ניהול שוטף, חשבוניות, דוחות' },
      { icon: '💰', title: 'ייעוץ מס', desc: 'תכנון מס חכם, חיסכון לגיטימי' },
      { icon: '📈', title: 'דוחות כספיים', desc: 'מאזנים, תזרים, דוחות לבנקים' },
      { icon: '🏢', title: 'הקמת עסקים', desc: 'פתיחת תיק, רישום חברה, ייעוץ' },
    ],
    testimonials: [
      { name: 'אלון שמיר', text: 'חסך לי עשרות אלפי שקלים בשנה. מקצועי ברמה גבוהה.', stars: 5 },
      { name: 'מור בן-דוד', text: 'מסביר הכל בצורה ברורה ופשוטה. שקט נפשי בעסק.', stars: 5 },
      { name: 'שלי ניר', text: 'תמיד זמין, תמיד בצד שלי. ממליץ לכל בעל עסק.', stars: 5 },
    ],
    accent: '#0891b2',
    emoji: '📊',
    badges: ['📊 15+ שנות ניסיון', '💼 500+ לקוחות', '💰 חיסכון מוכח'],
    copy: {
      servicesEyebrow: 'השירותים הפיננסיים שלנו',
      servicesH2: 'ניהול חכם, חיסכון אמיתי',
      whyEyebrow: 'הסוד שלנו',
      whyH2: 'דיוק, מקצועיות, שקט נפשי',
      reviewsEyebrow: 'לקוחות עסקיים',
      reviewsH2: 'שקט נפשי אמיתי',
    },
    heading: { weight: 700, spacing: '-0.5px' },
  },
  shop: {
    layout: 'hero',
    heroTag: 'מבחר · עיצוב · מחיר הוגן',
    headline: name => name || 'בחרו מה שמגדיר אתכם',
    subline: biz =>
      `לא מוכרים מוצרים — מציעים חוויה${biz.city ? ` ב${biz.city}` : ''}. מהכניסה עד הקנייה: שירות שמרגיש אחר לחלוטין.`,
    cta: 'בקרו בחנות',
    services: [
      { icon: '📦', title: 'מגוון רחב', desc: 'אלפי מוצרים מהמותגים המובילים' },
      { icon: '🚚', title: 'משלוח מהיר', desc: 'עד הבית תוך 24–48 שעות' },
      { icon: '💳', title: 'תשלום נוח', desc: 'אשראי, מזומן, ביט ופייבוקס' },
      { icon: '🔄', title: 'החלפות והחזרות', desc: 'מדיניות גמישה — 14 ימי החזרה' },
    ],
    testimonials: [
      { name: 'ענת מור', text: 'קנייה נוחה, מחירים טובים ושירות מעולה!', stars: 5 },
      { name: 'יעקב ששון', text: 'הגיע בדיוק כמו שהובטח. חנות מומלצת!', stars: 5 },
      { name: 'הדר פרי', text: 'תמיד מוצאת מה שאני צריכה. חוזרת שוב ושוב.', stars: 5 },
    ],
    accent: '#7c3aed',
    emoji: '🛍️',
    badges: ['🛍️ מגוון ענק', '⚡ משלוח מהיר', '✅ ביקורות מצוינות'],
    copy: {
      servicesEyebrow: 'הקטגוריות שלנו',
      servicesH2: 'כל מה שאתם צריכים',
      whyEyebrow: 'למה לקנות אצלנו',
      whyH2: 'מחיר הוגן + שירות אמיתי',
      reviewsEyebrow: 'קונים מרוצים',
      reviewsH2: 'בחרו נכון',
    },
    heading: { weight: 800, spacing: '-1px' },
  },
  startup: {
    layout: 'tech',
    heroTag: 'BUILD · SCALE · DOMINATE',
    headline: name => name || 'הטכנולוגיה שמשנה את המשחק',
    subline: biz =>
      `AI לא עתיד — AI עכשיו${biz.city ? ` · ${biz.city}` : ''}. עסקים שמשתמשים בנו צמחו פי 3 תוך רבעון. הגיע הזמן שלכם.`,
    cta: 'תיאמו פגישה חינמית',
    services: [
      { icon: '🤖', title: 'פתרונות AI', desc: 'אוטומציה, chatbots, ניתוח נתונים' },
      { icon: '📱', title: 'פיתוח אפליקציות', desc: 'iOS, Android, Web — מהר ובמחיר הוגן' },
      { icon: '📊', title: 'ניתוח נתונים', desc: 'דשבורדים, KPIs, דוחות בזמן אמת' },
      { icon: '🔗', title: 'אינטגרציות', desc: 'CRM, ERP, תשלומים — חיבורים חכמים' },
    ],
    testimonials: [
      { name: 'גיל לבנה', text: 'האוטומציה שלהם חסכה לנו 20 שעות עבודה בשבוע!', stars: 5 },
      { name: 'נטע ברון', text: 'מהר, מקצועי ועם ראיה עסקית אמיתית. שותפים לחיים!', stars: 5 },
      { name: 'עמית כץ', text: 'הפתרון שלהם הכפיל את ההכנסות שלנו תוך רבעון.', stars: 5 },
    ],
    accent: '#6366f1',
    emoji: '🚀',
    badges: ['🚀 50+ פרויקטים', '⭐ לקוחות מרוצים', '🤖 AI-First'],
    copy: {
      servicesEyebrow: 'הפתרונות שלנו',
      servicesH2: 'AI שמשנה את המשחק',
      whyEyebrow: 'הגישה שלנו',
      whyH2: 'AI-First — מהר יותר, זול יותר',
      reviewsEyebrow: 'שותפים לדרך',
      reviewsH2: 'תוצאות מדידות',
    },
    heading: { weight: 800, spacing: '-2px' },
  },
}

// ── Hero background images (Unsplash) — curated, cinematic ─────────
const HERO_IMAGES = {
  flooring:   'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=90&auto=format&fit=crop',
  restaurant: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=90&auto=format&fit=crop',
  beauty:     'https://images.unsplash.com/photo-1519415387722-a1c3bbef716c?w=1400&q=90&auto=format&fit=crop',
  lawyer:     'https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?w=1400&q=90&auto=format&fit=crop',
  gym:        'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=1400&q=90&auto=format&fit=crop',
  accounting: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1400&q=90&auto=format&fit=crop',
  shop:       'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1400&q=90&auto=format&fit=crop',
  startup:    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400&q=90&auto=format&fit=crop',
}

// ── Style themes ─────────────────────────────────────────────────────
const STYLE_THEMES = {
  modern: {
    bg: '#070711', surf: '#12121f', surf2: '#1a1a2e',
    border: 'rgba(255,255,255,0.07)',
    text: '#f1f5f9', text2: '#94a3b8', text3: '#475569',
    isDark: true, forceAccent: null,
  },
  classic: {
    bg: '#fafaf5', surf: '#f0ede3', surf2: '#e5e0d4',
    border: 'rgba(0,0,0,0.08)',
    text: '#1a1a2e', text2: '#4a4a68', text3: '#9a9ab8',
    isDark: false, forceAccent: null,
  },
  bold: {
    bg: '#090909', surf: '#141414', surf2: '#1e1e1e',
    border: 'rgba(255,255,255,0.06)',
    text: '#ffffff', text2: '#cccccc', text3: '#666666',
    isDark: true, forceAccent: null,
  },
  luxe: {
    bg: '#07060a', surf: '#0f0d14', surf2: '#16131e',
    border: 'rgba(201,162,39,0.14)',
    text: '#f5f0e8', text2: '#c0b090', text3: '#705e40',
    isDark: true, forceAccent: '#c9a227',
  },
}

// ── Per-bizType background palette patches ───────────────────────────
// Each vertical gets its own emotional world — not the same purple startup bg
const BIZ_THEME_PATCHES = {
  flooring:   { bg: '#0a0700', surf: '#130e04', surf2: '#1c1508' },
  restaurant: { bg: '#0d0305', surf: '#180508', surf2: '#22080d' },
  gym:        { bg: '#060606', surf: '#101010', surf2: '#181818' },
  beauty:     { bg: '#07050a', surf: '#0f0914', surf2: '#18101f' },
  lawyer:     { bg: '#020812', surf: '#06101e', surf2: '#0a1629' },
  accounting: { bg: '#030b12', surf: '#081219', surf2: '#0d1a24' },
  shop:       { bg: '#06030f', surf: '#0d0819', surf2: '#130d24' },
  startup:    { bg: '#04081a', surf: '#080e24', surf2: '#0e162e' },
}

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : '124,58,237'
}

function parseCustomServices(str, fallback) {
  if (!str || !str.trim()) return fallback
  const parts = str.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length < 2) return fallback
  return parts.slice(0, 4).map((title, i) => ({
    icon: fallback[i]?.icon || '✨',
    title,
    desc: fallback[i]?.desc || '',
  }))
}

// ── Goal → CTA mapping ───────────────────────────────────────────────
const GOAL_CTA = {
  wa_leads:  { label: 'כתבו לנו בוואטסאפ',    icon: '💬', useWa: true  },
  calls:     { label: 'התקשרו עכשיו',          icon: '📞', useWa: false },
  bookings:  { label: 'הזמינו תור עכשיו',      icon: '📅', useWa: true  },
  ecommerce: { label: 'לחנות שלנו →',           icon: '🛒', useWa: false },
}

// ── Proof label mapping ──────────────────────────────────────────────
const PROOF_LABELS = {
  years:    n => `${n || ''}שנות ניסיון`,
  projects: () => '100+ פרויקטים',
  reviews:  () => '⭐ ביקורות מצוינות',
  warranty: () => '🔒 אחריות מלאה',
  media:    () => '📰 כוסינו בתקשורת',
}
const PROOF_ICONS = {
  years: '🕐', projects: '📁', reviews: '⭐', warranty: '🔒', media: '📰',
}

// ── Style vibe → theme override ──────────────────────────────────────
const VIBE_THEME_MAP = {
  luxury: 'luxe', modern: 'modern', warm: 'classic',
  aggressive: 'bold', minimal: 'modern',
}

// ════════════════════════════════════════════════════════════════════
// DNA SECTIONS — unique per business category
// ════════════════════════════════════════════════════════════════════

// ── GYM: energy stats bar ────────────────────────────────────────────
function GymStatsBar() {
  return (
    <div className="dw-gym-stats">
      <div className="dw-container dw-gym-stats-inner">
        {[
          { n: '1,000+', l: 'חברים פעילים'     },
          { n: '15',     l: 'מאמנים מוסמכים'   },
          { n: '24/7',   l: 'פתוח תמיד'         },
          { n: '6',      l: 'שנות פעילות'       },
        ].map((s, i) => (
          <div key={i} className="dw-gym-stat">
            <div className="dw-gym-stat-n">{s.n}</div>
            <div className="dw-gym-stat-l">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── GYM: 3-step transformation journey ───────────────────────────────
function GymTransformation() {
  return (
    <section className="dw-section dw-gym-journey">
      <div className="dw-container">
        <div className="dw-section-eyebrow">המסע שלך מתחיל כאן</div>
        <h2 className="dw-h2">תוצאות מוכחות — שלב אחרי שלב</h2>
        <div className="dw-journey-grid">
          {[
            { t: 'שבוע 1',  title: 'הצעד הראשון', desc: 'הערכה אישית, תוכנית מותאמת, אימון פתיחה', icon: '🎯' },
            { t: 'חודש 1',  title: 'הבסיס מוכן',  desc: 'כוח, קרדיו, הרגלים נכונים — מרגישים שינוי', icon: '💪' },
            { t: 'חודש 3+', title: 'השינוי נראה',  desc: 'תוצאות מדידות, הגוף השתנה, הביטחון עלה',   icon: '🏆' },
          ].map((s, i) => (
            <div key={i} className="dw-journey-card">
              <div className="dw-journey-icon">{s.icon}</div>
              <div className="dw-journey-tag">{s.t}</div>
              <div className="dw-journey-title">{s.title}</div>
              <div className="dw-journey-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── RESTAURANT: cinematic menu preview ───────────────────────────────
function RestaurantMenu({ primaryCta, ctaLabel }) {
  return (
    <section className="dw-section dw-restaurant-menu">
      <div className="dw-container">
        <div className="dw-section-eyebrow">מה בתפריט</div>
        <h2 className="dw-h2">טעמים שחוזרים אליהם</h2>
        <div className="dw-menu-grid">
          {[
            { cat: '🥗 ראשונות',   items: ['סלט ים תיכוני', 'ברוסקטה עגבניות', 'מרק יום'] },
            { cat: '🥩 עיקריות',   items: ['אנטריקוט גריל', 'דג השף', 'פסטה ביתית'] },
            { cat: '🍰 קינוחים',   items: ['עוגת שוקולד חם', 'פנה קוטה', 'סורבה ביתי'] },
          ].map((m, i) => (
            <div key={i} className="dw-menu-cat">
              <div className="dw-menu-cat-title">{m.cat}</div>
              <ul className="dw-menu-items">
                {m.items.map((item, j) => <li key={j} className="dw-menu-item">{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="dw-menu-cta">{primaryCta(ctaLabel, 'dw-btn-primary')}</div>
      </div>
    </section>
  )
}

// ── BEAUTY: soft numbered ritual ─────────────────────────────────────
function BeautyRitual() {
  return (
    <section className="dw-section dw-beauty-ritual">
      <div className="dw-container">
        <div className="dw-section-eyebrow">הטקס שלנו</div>
        <h2 className="dw-h2">חוויה שמתחילה עוד לפני הטיפול</h2>
        <div className="dw-ritual-steps">
          {[
            { n: '01', title: 'ייעוץ אישי',   desc: 'מבינות את הצרכים שלכן ובונות תוכנית מותאמת' },
            { n: '02', title: 'אווירה שקטה',  desc: 'ריחות מרגיעים, מוזיקה, סביבה שרק בשבילכן'   },
            { n: '03', title: 'הטיפול עצמו',  desc: 'מוצרים מקצועיים, יד אמן, קשב מלא'           },
            { n: '04', title: 'מעקב וטיפול',  desc: 'המלצות לשמירה בבית, תזכורת לתור הבא'        },
          ].map((s, i) => (
            <div key={i} className="dw-ritual-step">
              <div className="dw-ritual-n">{s.n}</div>
              <div className="dw-ritual-body">
                <div className="dw-ritual-title">{s.title}</div>
                <div className="dw-ritual-desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── LAWYER / ACCOUNTING: authority credentials bar ────────────────────
function CredentialsBar({ bizType }) {
  const stats = bizType === 'accounting'
    ? [{ n: '15+', l: 'שנות ניסיון' }, { n: '500+', l: 'לקוחות עסקיים' }, { n: '₪M+', l: 'חסכון ללקוחות' }, { n: '100%', l: 'שקיפות מלאה' }]
    : [{ n: '20+', l: 'שנות ניסיון' }, { n: '500+', l: 'תיקים מוצלחים' }, { n: '98%',  l: 'שביעות רצון'  }, { n: '24/7', l: 'זמינות ללקוחות' }]
  return (
    <div className="dw-credentials-bar">
      <div className="dw-container dw-credentials-inner">
        {stats.map((s, i) => (
          <div key={i} className="dw-credential">
            <div className="dw-credential-n">{s.n}</div>
            <div className="dw-credential-l">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── FLOORING: material showcase ───────────────────────────────────────
function FlooringMaterials() {
  return (
    <section className="dw-section dw-flooring-mats">
      <div className="dw-container">
        <div className="dw-section-eyebrow">החומרים שלנו</div>
        <h2 className="dw-h2">איכות שרואים — ומרגישים</h2>
        <div className="dw-mats-grid">
          {[
            { emoji: '🪵', name: 'אלון אירופאי', desc: 'עמיד, חם, נצחי — הקלאסיקה שתמיד עובדת' },
            { emoji: '🌲', name: 'במבוק',         desc: 'אקולוגי, קשיח יותר מרוב העצים, מודרני'  },
            { emoji: '🏛️', name: 'פורצלן',        desc: 'עמיד למים, ניקוי קל, אלפי דוגמאות'      },
            { emoji: '✨', name: 'שיש טבעי',      desc: 'יוקרה אמיתית, כל לוח ייחודי בעולם'      },
          ].map((m, i) => (
            <div key={i} className="dw-mat-card">
              <div className="dw-mat-emoji">{m.emoji}</div>
              <div className="dw-mat-name">{m.name}</div>
              <div className="dw-mat-desc">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── STARTUP: live metrics ticker ─────────────────────────────────────
function StartupMetrics() {
  return (
    <div className="dw-startup-metrics">
      <div className="dw-container dw-startup-metrics-inner">
        {[
          { n: '50+',  l: 'פרויקטים שהושקו' },
          { n: '3x',   l: 'ממוצע גדילה ללקוח' },
          { n: '< 2h', l: 'זמן תגובה ממוצע'  },
          { n: '100%', l: 'מחויבות לתוצאות'  },
        ].map((s, i) => (
          <div key={i} className="dw-startup-metric">
            <div className="dw-startup-metric-n">{s.n}</div>
            <div className="dw-startup-metric-l">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// PER-VERTICAL SERVICE LAYOUTS — each feels like a different agency
// ════════════════════════════════════════════════════════════════════

// ── LAWYER / ACCOUNTING: editorial numbered list ─────────────────────
function LawServicesSection({ services, copy }) {
  return (
    <section className="dw-section dw-services-law" id="services">
      <div className="dw-container">
        <div className="dw-section-eyebrow">{copy.servicesEyebrow}</div>
        <h2 className="dw-h2">{copy.servicesH2}</h2>
        <div className="dw-law-list">
          {services.map((s, i) => (
            <div key={i} className="dw-law-item">
              <div className="dw-law-num">0{i + 1}</div>
              <div className="dw-law-body">
                <h3 className="dw-law-title">{s.title}</h3>
                <p className="dw-law-desc">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── GYM: bold raw typographic tiles ─────────────────────────────────
function GymServicesSection({ services, copy }) {
  return (
    <section className="dw-section dw-services-gym-sec" id="services">
      <div className="dw-container">
        <div className="dw-section-eyebrow">{copy.servicesEyebrow}</div>
        <h2 className="dw-h2">{copy.servicesH2}</h2>
        <div className="dw-gym-srv-grid">
          {services.map((s, i) => (
            <div key={i} className="dw-gym-srv">
              <div className="dw-gym-srv-n">{String(i + 1).padStart(2, '0')}</div>
              <h3 className="dw-gym-srv-title">{s.title}</h3>
              <p className="dw-gym-srv-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── BEAUTY: soft editorial single-column list ────────────────────────
function BeautyServicesSection({ services, copy }) {
  return (
    <section className="dw-section dw-services-beauty-sec" id="services">
      <div className="dw-container">
        <div className="dw-section-eyebrow">{copy.servicesEyebrow}</div>
        <h2 className="dw-h2">{copy.servicesH2}</h2>
        <div className="dw-beauty-srv-list">
          {services.map((s, i) => (
            <div key={i} className="dw-beauty-srv">
              <span className="dw-beauty-srv-n">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="dw-beauty-srv-title">{s.title}</h3>
                <p className="dw-beauty-srv-desc">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── FLOORING: architectural feature blocks ───────────────────────────
function FlooringServicesSection({ services, copy }) {
  return (
    <section className="dw-section dw-services-floor-sec" id="services">
      <div className="dw-container">
        <div className="dw-section-eyebrow">{copy.servicesEyebrow}</div>
        <h2 className="dw-h2">{copy.servicesH2}</h2>
        <div className="dw-floor-srv-grid">
          {services.map((s, i) => (
            <div key={i} className="dw-floor-srv">
              <h3 className="dw-floor-srv-title">{s.title}</h3>
              <p className="dw-floor-srv-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── RESTAURANT: menu-editorial horizontal list ───────────────────────
function RestaurantServicesSection({ services, copy }) {
  return (
    <section className="dw-section dw-services-rest-sec" id="services">
      <div className="dw-container">
        <div className="dw-section-eyebrow">{copy.servicesEyebrow}</div>
        <h2 className="dw-h2">{copy.servicesH2}</h2>
        <div className="dw-rest-srv-list">
          {services.map((s, i) => (
            <div key={i} className="dw-rest-srv">
              <h3 className="dw-rest-srv-title">{s.title}</h3>
              <p className="dw-rest-srv-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Main component ───────────────────────────────────────────────────
export default function DynamicWebsitePage({ custom = {} }) {
  const [biz, setBiz] = useState({})
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('saas_biz') || '{}')
      const merged = { ...saved }
      Object.entries(custom).forEach(([k, v]) => { if (v) merged[k] = v })
      setBiz(merged)
    } catch { setBiz({}) }
  }, [custom])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const hasData = Boolean(biz.bizType)
  const effectiveBizType = biz._layoutBizType || biz.bizType
  const config  = BIZ_CONFIGS[effectiveBizType] || BIZ_CONFIGS.startup
  // prefer styleVibe → theme, fallback to style field
  const themeKey  = VIBE_THEME_MAP[biz.styleVibe] || biz.style || 'modern'
  const baseTheme = STYLE_THEMES[themeKey] || STYLE_THEMES.modern
  // Each bizType gets its own bg world; patch only non-luxe/classic themes
  const bizPatch  = (themeKey === 'modern' || themeKey === 'bold') ? (BIZ_THEME_PATCHES[effectiveBizType] || {}) : {}
  const theme     = { ...baseTheme, ...bizPatch }
  const accent    = theme.forceAccent || config.accent
  const rgb     = hexToRgb(accent)
  const aa      = (a) => `rgba(${rgb},${a})`

  const name     = biz.name  || ''
  const city     = biz.city  || ''
  const phone    = biz.phone || ''
  const waNum    = biz.waNum || ''

  // Rich interview fields
  const heroOffer      = biz.heroOffer      || ''
  const premiumService = biz.premiumService || ''
  const differentiator = biz.differentiator || ''
  const proofTypes     = Array.isArray(biz.proofTypes) ? biz.proofTypes : []
  const mainGoal       = biz.mainGoal       || 'wa_leads'
  const mainObjection  = biz.mainObjection  || ''

  // CTA strategy based on mainGoal
  const goalCta = GOAL_CTA[mainGoal] || GOAL_CTA.wa_leads
  const ctaLabel = heroOffer || goalCta.label

  const services = parseCustomServices(
    biz.services || premiumService,
    config.services
  )

  const waHref = waNum
    ? `https://wa.me/${waNum}?text=${encodeURIComponent(`שלום! ראיתי את האתר — ${ctaLabel}`)}`
    : null

  // Primary CTA link
  const primaryCta = (label, cls) => {
    if (goalCta.useWa && waHref)
      return <a href={waHref} target="_blank" rel="noreferrer" className={cls}>{goalCta.icon} {label} →</a>
    if (phone)
      return <a href={`tel:${phone}`} className={cls}>{goalCta.icon} {label} →</a>
    return <button className={cls}>{goalCta.icon} {label} →</button>
  }

  const h = config.heading || { weight: 800, spacing: '-1px' }
  const copy = config.copy || {
    servicesEyebrow: 'השירותים שלנו', servicesH2: 'מה אנחנו מציעים',
    whyEyebrow: 'למה לבחור בנו?', whyH2: 'מקצועיות, אמינות ותוצאות',
    reviewsEyebrow: 'לקוחות מרוצים', reviewsH2: 'מה הם אומרים עלינו',
  }

  const cssVars = {
    '--dw-bg':      theme.bg,
    '--dw-surf':    theme.surf,
    '--dw-surf2':   theme.surf2,
    '--dw-border':  theme.border,
    '--dw-text':    theme.text,
    '--dw-text2':   theme.text2,
    '--dw-text3':   theme.text3,
    '--dw-accent':  accent,
    '--dw-accent1': aa(0.12),
    '--dw-accent2': aa(0.25),
    '--dw-accent3': aa(0.4),
    '--dw-hero-glow': `radial-gradient(ellipse 70% 55% at 60% 30%, ${aa(0.22)} 0%, transparent 70%)`,
    '--dw-h1-weight':  h.weight,
    '--dw-h1-spacing': h.spacing,
  }

  const isBold      = themeKey === 'bold'
  const isClassic   = themeKey === 'classic'
  const heroLayout  = config.layout || 'hero'  // 'hero' | 'pro' | 'luxe' | 'tech'

  if (!hasData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0d0d1a', color: '#fff', fontFamily: 'Heebo, sans-serif', direction: 'rtl', gap: 24, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>✦</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>לא נוצר אתר עדיין</h2>
        <p style={{ color: '#aaa', fontSize: 16, margin: 0, maxWidth: 340 }}>השלימו את תהליך ה-AI Interview כדי לייצר את האתר שלכם</p>
        <a href="/onboarding" style={{ background: '#7c3aed', color: '#fff', padding: '12px 28px', borderRadius: 12, textDecoration: 'none', fontWeight: 600, fontSize: 16 }}>
          התחילו כאן →
        </a>
      </div>
    )
  }

  return (
    <div className={`dw-root dw-dna--${effectiveBizType || 'default'}${isClassic ? ' dw-classic' : ''}${isBold ? ' dw-bold' : ''}`} style={cssVars}>

      {/* ── NAV ── */}
      <nav className={`dw-nav${scrolled ? ' dw-nav--sticky' : ''}`}>
        <div className="dw-nav-inner">
          <div className="dw-logo">
            <span className="dw-logo-emoji" aria-hidden="true">{config.emoji}</span>
            <span className="dw-logo-name">{name || config.headline('')}</span>
          </div>
          <div className="dw-nav-links">
            <a href="#services" className="dw-nav-link">שירותים</a>
            <a href="#testimonials" className="dw-nav-link">המלצות</a>
            <a href="#contact" className="dw-nav-link">צור קשר</a>
          </div>
          {waHref
            ? <a href={waHref} target="_blank" rel="noreferrer" className="dw-nav-cta">{config.cta}</a>
            : phone
              ? <a href={`tel:${phone}`} className="dw-nav-cta">{config.cta}</a>
              : <span className="dw-nav-cta">{config.cta}</span>
          }
        </div>
      </nav>

      {/* ── HERO ── */}
      {heroLayout === 'pro' ? (
        /* ── PRO layout: clean split, trust-first (lawyer, accounting) ── */
        <section className="dw-hero dw-hero--pro">
          {HERO_IMAGES[effectiveBizType] && (
            <div className="dw-hero-photo dw-hero-photo--pro" style={{ backgroundImage: `url(${HERO_IMAGES[effectiveBizType]})` }} aria-hidden="true" />
          )}
          <div className="dw-hero-overlay dw-hero-overlay--pro" aria-hidden="true" />
          <div className="dw-container dw-hero-pro-inner">
            <div className="dw-hero-pro-text">
              <div className="dw-hero-tag">{config.heroTag}</div>
              <h1 className="dw-h1">
                {heroOffer || premiumService
                  ? <>{heroOffer || premiumService}{name && <span className="dw-h1-sub-type">{name}</span>}</>
                  : name
                    ? config.headline(name)
                    : config.headline('')
                }
              </h1>
              <p className="dw-hero-sub">{differentiator || config.subline({ city })}</p>
              <div className="dw-hero-btns">
                {primaryCta(ctaLabel, 'dw-btn-primary')}
                {phone && waHref && <a href={`tel:${phone}`} className="dw-btn-outline">📞 {phone}</a>}
              </div>
            </div>
            <div className="dw-hero-pro-panel">
              <div className="dw-hero-pro-cred">
                <span className="dw-hero-pro-cred-n">{effectiveBizType === 'accounting' ? '15+' : '20+'}</span>
                <span className="dw-hero-pro-cred-l">שנות ניסיון</span>
              </div>
              <div className="dw-hero-pro-badges">
                {(proofTypes.length > 0 ? proofTypes : ['years','reviews','warranty']).map(pt => (
                  <div key={pt} className="dw-hero-pro-badge">
                    <span className="dw-hero-pro-badge-icon">{PROOF_ICONS[pt] || '✓'}</span>
                    <span>{PROOF_LABELS[pt]?.() || pt}</span>
                  </div>
                ))}
              </div>
              {primaryCta(config.cta, 'dw-btn-primary dw-btn-full')}
            </div>
          </div>
        </section>
      ) : heroLayout === 'luxe' ? (
        /* ── LUXE layout: centered elegant (beauty) ── */
        <section className="dw-hero dw-hero--luxe">
          <div className="dw-hero-glow" aria-hidden="true" />
          {HERO_IMAGES[effectiveBizType] && (
            <div className="dw-hero-photo" style={{ backgroundImage: `url(${HERO_IMAGES[effectiveBizType]})` }} aria-hidden="true" />
          )}
          <div className="dw-hero-overlay" aria-hidden="true" />
          <div className="dw-hero-luxe-inner">
            <div className="dw-hero-tag">{config.heroTag}</div>
            <h1 className="dw-h1">
              {heroOffer || premiumService
                ? <>{heroOffer || premiumService}{name && <span className="dw-h1-sub-type">{name}</span>}</>
                : name
                  ? <>{name}<span className="dw-h1-sub-type">{config.headline('')}</span></>
                  : config.headline('')
              }
            </h1>
            <p className="dw-hero-sub">{differentiator || config.subline({ city })}</p>
            <div className="dw-hero-btns dw-hero-btns--center">
              {primaryCta(ctaLabel, 'dw-btn-primary')}
              {phone && waHref && <a href={`tel:${phone}`} className="dw-btn-outline">📞 {phone}</a>}
            </div>
            <div className="dw-trust-row dw-trust-row--center">
              {(proofTypes.length > 0 ? proofTypes : config.badges.map((b,i) => ({ _raw: b, _i: i }))).map((pt, i) =>
                pt._raw
                  ? <span key={i} className="dw-trust-badge">{pt._raw}</span>
                  : <span key={pt} className="dw-trust-badge">{PROOF_ICONS[pt] || '✓'} {PROOF_LABELS[pt]?.() || pt}</span>
              )}
            </div>
          </div>
        </section>
      ) : (
        /* ── HERO layout: full image background (default, gym, shop, restaurant, startup) ── */
        <section className={`dw-hero${heroLayout === 'tech' ? ' dw-hero--tech' : ''}`}>
          <div className="dw-hero-glow" aria-hidden="true" />
          {HERO_IMAGES[effectiveBizType] && (
            <div
              className="dw-hero-photo"
              style={{ backgroundImage: `url(${HERO_IMAGES[effectiveBizType]})` }}
              aria-hidden="true"
            />
          )}
          <div className="dw-hero-overlay" aria-hidden="true" />
          {(isBold || heroLayout === 'tech') && <div className="dw-hero-lines" aria-hidden="true" />}
          <div className="dw-hero-inner">
            <div className="dw-hero-tag">{config.heroTag}</div>
            <h1 className="dw-h1">
              {heroOffer || premiumService
                ? <>{heroOffer || premiumService}{name && <span className="dw-h1-sub-type">{name}</span>}</>
                : name
                  ? <>{name}<span className="dw-h1-sub-type">{config.headline('')}</span></>
                  : config.headline('')
              }
            </h1>
            <p className="dw-hero-sub">{differentiator || config.subline({ city })}</p>
            <div className="dw-hero-btns">
              {primaryCta(ctaLabel, 'dw-btn-primary')}
              {phone && waHref && <a href={`tel:${phone}`} className="dw-btn-outline">📞 {phone}</a>}
            </div>
            <div className="dw-trust-row">
              {proofTypes.length > 0
                ? proofTypes.map(pt => (
                    <span key={pt} className="dw-trust-badge">
                      {PROOF_ICONS[pt] || '✓'} {PROOF_LABELS[pt]?.() || pt}
                    </span>
                  ))
                : config.badges.map((b, i) => (
                    <span key={i} className="dw-trust-badge">{b}</span>
                  ))
              }
            </div>
          </div>
        </section>
      )}

      {/* ── DNA: full-width stats / credentials bar ── */}
      {effectiveBizType === 'gym' && <GymStatsBar />}
      {effectiveBizType === 'startup' && <StartupMetrics />}
      {(effectiveBizType === 'lawyer' || effectiveBizType === 'accounting') && <CredentialsBar bizType={effectiveBizType} />}

      {/* ── PROOF BAR (if proofTypes set) ── */}
      {proofTypes.length > 0 && (
        <div className="dw-proof-bar">
          <div className="dw-container dw-proof-inner">
            {proofTypes.map(pt => (
              <div key={pt} className="dw-proof-item">
                <span className="dw-proof-icon">{PROOF_ICONS[pt] || '✓'}</span>
                <span className="dw-proof-label">{PROOF_LABELS[pt]?.() || pt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DNA: pre-services unique sections ── */}
      {effectiveBizType === 'beauty'     && <BeautyRitual />}
      {effectiveBizType === 'gym'        && <GymTransformation />}
      {effectiveBizType === 'restaurant' && <RestaurantMenu primaryCta={primaryCta} ctaLabel={ctaLabel} />}

      {/* ── SERVICES — per-vertical layout ── */}
      {(effectiveBizType === 'lawyer' || effectiveBizType === 'accounting')
        ? <LawServicesSection services={services} copy={copy} />
        : effectiveBizType === 'gym'
          ? <GymServicesSection services={services} copy={copy} />
          : effectiveBizType === 'beauty'
            ? <BeautyServicesSection services={services} copy={copy} />
            : effectiveBizType === 'flooring'
              ? <FlooringServicesSection services={services} copy={copy} />
              : effectiveBizType === 'restaurant'
                ? <RestaurantServicesSection services={services} copy={copy} />
                : (
                  <section className="dw-section" id="services">
                    <div className="dw-container">
                      <div className="dw-section-eyebrow">{copy.servicesEyebrow}</div>
                      <h2 className="dw-h2">{copy.servicesH2}</h2>
                      <div className="dw-services-grid">
                        {services.map((s, i) => (
                          <div key={i} className="dw-service-card">
                            <div className="dw-service-icon-wrap">
                              <span className="dw-service-icon" aria-hidden="true">{s.icon}</span>
                            </div>
                            <h3 className="dw-service-title">{s.title}</h3>
                            <p className="dw-service-desc">{s.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )
      }

      {/* ── DNA: post-services unique sections ── */}
      {effectiveBizType === 'flooring' && <FlooringMaterials />}

      {/* ── DIFFERENTIATOR STRIP ── */}
      <div className="dw-strip">
        <div className="dw-container dw-strip-inner">
          <div className="dw-strip-left">
            <div className="dw-section-eyebrow">{copy.whyEyebrow}</div>
            <h2 className="dw-h2 dw-h2--sm">{differentiator ? copy.whyH2 : copy.whyH2}</h2>
            <p className="dw-strip-desc">
              {differentiator || config.subline({ city })}
            </p>
            {mainObjection && (
              <div className="dw-objection-box">
                <span className="dw-objection-icon">💡</span>
                <div>
                  <div className="dw-objection-q">חוששים ש{mainObjection}?</div>
                  <div className="dw-objection-a">אנחנו מבינים — ולכן מציעים שקיפות מלאה ואחריות בכתב.</div>
                </div>
              </div>
            )}
            {primaryCta(ctaLabel, 'dw-btn-primary')}
          </div>
          <div className="dw-strip-stats">
            {(proofTypes.length > 0 ? proofTypes : ['years', 'reviews', 'warranty']).map(pt => (
              <div key={pt} className="dw-strip-stat">
                {PROOF_ICONS[pt] || '✓'} {PROOF_LABELS[pt]?.() || pt}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TESTIMONIALS ── */}
      <section className="dw-section dw-section--alt" id="testimonials">
        <div className="dw-container">
          <div className="dw-section-eyebrow">{copy.reviewsEyebrow}</div>
          <h2 className="dw-h2">{copy.reviewsH2}</h2>
          <div className="dw-testimonials-grid">
            {config.testimonials.map((t, i) => (
              <div key={i} className={`dw-testimonial${i === 0 ? ' dw-testimonial--featured' : ''}`}>
                <div className="dw-testimonial-stars">{'★★★★★'.slice(0, t.stars)}</div>
                <p className="dw-testimonial-text">"{t.text}"</p>
                <div className="dw-testimonial-name">— {t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section className="dw-contact" id="contact">
        <div className="dw-contact-glow" aria-hidden="true" />
        <div className="dw-container dw-contact-inner">
          <div className="dw-section-eyebrow">צרו קשר</div>
          <h2 className="dw-h2">{heroOffer || config.cta}</h2>
          <p className="dw-contact-sub">מוכנים לשוחח. פנו אלינו ונחזור אליכם תוך שעה.</p>
          <div className="dw-contact-btns">
            {waHref && (
              <a href={waHref} target="_blank" rel="noreferrer" className="dw-btn-wa">
                💬 WhatsApp
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="dw-btn-outline dw-btn-lg">
                📞 {phone}
              </a>
            )}
            {!waHref && !phone && (
              <span className="dw-btn-primary dw-btn-lg">{config.cta}</span>
            )}
          </div>
          {city && <div className="dw-contact-city">📍 {city}</div>}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="dw-footer">
        <div className="dw-container">
          <div className="dw-footer-top">
            <div className="dw-footer-brand-col">
              <div className="dw-footer-brand">
                {config.emoji} {name || config.headline('')}
                {city && <span className="dw-footer-city"> · {city}</span>}
              </div>
              {(phone || waHref) && (
                <div className="dw-footer-contact">
                  {phone && <a href={`tel:${phone}`} className="dw-footer-contact-link">📞 {phone}</a>}
                  {waHref && <a href={waHref} target="_blank" rel="noreferrer" className="dw-footer-contact-link">💬 WhatsApp</a>}
                </div>
              )}
            </div>
            <nav className="dw-footer-links" aria-label="קישורי כותרת תחתית">
              <a href="#contact" className="dw-footer-link">צור קשר</a>
              <a href="#services" className="dw-footer-link">שירותים</a>
              <a href="/privacy" className="dw-footer-link">מדיניות פרטיות</a>
              <a href="/terms" className="dw-footer-link">תנאי שימוש</a>
            </nav>
          </div>
          <div className="dw-footer-bottom">
            <div className="dw-footer-copy">
              © {new Date().getFullYear()} {name || config.headline('')}. כל הזכויות שמורות.
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
