/**
 * scoringEngine.js
 * Analyzes a growth package and returns scores, recommendations, and auto-tasks.
 */

const URGENCY_WORDS = ['עכשיו','היום','מהר','דחוף','מוגבל','שבוע','חודש','ראשון','בלבד']
const OFFER_WORDS   = ['חינם','מבצע','הנחה','מיוחד','ייעוץ','ניסיון','ראשון','ללא עלות']
const DIFF_WORDS    = ['מקצועי','ניסיון','מומחה','מוסמך','מוכח','ייחודי','הטוב','שנים']

export function scoreGrowthPackage(pkg) {
  if (!pkg) return null
  const desc  = (pkg.description || '').toLowerCase()
  const dlen  = desc.length

  const hasUrgency = URGENCY_WORDS.some(w => desc.includes(w))
  const hasOffer   = OFFER_WORDS.some(w => desc.includes(w))
  const hasDiff    = DIFF_WORDS.some(w => desc.includes(w))
  const hasPhone   = !!pkg.phone

  // ── SEO (local presence, keywords, completeness) ──────────────
  let seo = 35
  if (pkg.city)               seo += 15
  if (hasPhone)               seo += 10
  if (dlen > 40)              seo += 10
  if (dlen > 100)             seo += 10
  if (pkg.bizType !== 'default') seo += 10
  if (pkg.name?.length > 3)   seo += 10
  seo = Math.min(seo, 97)

  // ── Conversion (CTA, offers, urgency, pricing) ────────────────
  let conversion = 25
  if (hasPhone)               conversion += 20
  if (hasOffer)               conversion += 20
  if (hasUrgency)             conversion += 15
  if (pkg.offers?.length >= 3) conversion += 10
  if (pkg.packages?.length >= 3) conversion += 10
  conversion = Math.min(conversion, 97)

  // ── Trust (reviews, social proof, credentials) ────────────────
  const reviewCount = pkg.landing?.reviews?.length || 0
  let trust = 35
  if (reviewCount >= 3)       trust += 25
  if (reviewCount >= 1)       trust += 10
  if (pkg.landing?.badge)     trust += 10
  if (hasPhone)               trust += 10
  if (hasDiff)                trust += 10
  trust = Math.min(trust, 97)

  // ── WhatsApp funnel strength ──────────────────────────────────
  const waCount = pkg.waFunnel?.length || 0
  const waText  = (pkg.waFunnel || []).join(' ').toLowerCase()
  const waHasUrgency = URGENCY_WORDS.some(w => waText.includes(w))
  let whatsapp = 15
  if (waCount >= 3)           whatsapp += 25
  if (waCount >= 5)           whatsapp += 20
  if (hasPhone)               whatsapp += 20
  if (waHasUrgency)           whatsapp += 15
  if (pkg.followUps?.length >= 3) whatsapp += 5
  whatsapp = Math.min(whatsapp, 97)

  // ── Content diversity & quality ───────────────────────────────
  const postCount = pkg.posts?.length || 0
  let content = 20
  if (postCount >= 3)         content += 20
  if (postCount >= 5)         content += 20
  if (pkg.facebookAd?.primaryText) content += 15
  if (pkg.googleAd?.headlines?.length >= 3) content += 10
  if (pkg.salesScript?.opening)   content += 10
  if (pkg.packages?.length >= 3)  content += 5
  content = Math.min(content, 97)

  const overall = Math.round((seo + conversion + trust + whatsapp + content) / 5)

  // ── Recommendations ───────────────────────────────────────────
  const recs = []

  if (conversion < 65) recs.push({
    id: 'cta', icon: '🎯', severity: 'high',
    title: 'ה-CTA חלש מדי',
    text: 'הוסף הצעה ספציפית ודחיפות. לדוגמה: "ייעוץ חינם עד יום שישי – מקומות מוגבלים".',
    cmd: '/high-conversion',
  })

  if (!hasPhone) recs.push({
    id: 'phone', icon: '📱', severity: 'high',
    title: 'חסר מספר ווצאפ',
    text: 'מספר ווצאפ גלוי מגדיל לידים ב-60%. הוסף מספר כדי שלקוחות יוכלו ליצור קשר מיידית.',
    cmd: null,
  })

  if (!hasUrgency) recs.push({
    id: 'urgency', icon: '⏰', severity: 'high',
    title: 'אין דחיפות בתוכן',
    text: 'תוכן ללא דחיפות מאפשר ללקוחות לדחות. הוסף "מקומות מוגבלים" או "עד סוף החודש".',
    cmd: '/urgency',
  })

  if (trust < 65) recs.push({
    id: 'trust', icon: '⭐', severity: 'medium',
    title: 'בניית אמון חלשה',
    text: 'הוסף המלצות ספציפיות עם שמות ומספרים (כמה לקוחות, כמה חסכת להם).',
    cmd: '/formal',
  })

  if (!hasOffer) recs.push({
    id: 'offer', icon: '🎁', severity: 'medium',
    title: 'אין הצעת ערך ברורה',
    text: 'לקוחות צריכים סיבה לפעול עכשיו. הוסף "ייעוץ ראשוני חינם" כהצעת כניסה.',
    cmd: '/high-conversion',
  })

  if (seo < 65) recs.push({
    id: 'seo', icon: '🔍', severity: 'low',
    title: 'SEO מקומי חלש',
    text: 'הוסף שם העיר ומילות מפתח ספציפיות לתחום בכל חלקי התוכן.',
    cmd: null,
  })

  if (whatsapp < 70) recs.push({
    id: 'whatsapp', icon: '💬', severity: 'low',
    title: 'משפך ווצאפ לא מיטבי',
    text: 'הוסף דחיפות ו-CTA ברורים בכל הודעת ווצאפ. ההודעה השנייה צריכה להיות קצרה וישירה.',
    cmd: '/urgency',
  })

  // ── Auto-tasks (top 5 actionable items) ──────────────────────
  const tasks = recs.slice(0, 5).map((r, i) => ({
    id: r.id,
    icon: r.icon,
    title: `${r.icon} ${r.title}`,
    desc: r.text.split('.')[0] + '.',
    cmd: r.cmd,
    priority: r.severity,
    done: false,
  }))

  return { seo, conversion, trust, whatsapp, content, overall, recommendations: recs, tasks }
}

export function getScoreLabel(score) {
  if (score >= 85) return { label: 'מצוין', color: '#22c55e' }
  if (score >= 70) return { label: 'טוב', color: '#84cc16' }
  if (score >= 55) return { label: 'בינוני', color: '#eab308' }
  return { label: 'חלש', color: '#ef4444' }
}
