import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import './OnboardingPage.css'

// ─── Constants ──────────────────────────────────────────────────────

const BIZ_TYPES = [
  { id: 'flooring',    icon: '🪵', label: 'פרקט וריצוף'  },
  { id: 'restaurant',  icon: '🍽️', label: 'מסעדה'         },
  { id: 'beauty',      icon: '💅', label: 'מכון יופי'     },
  { id: 'lawyer',      icon: '⚖️', label: 'עורך דין'      },
  { id: 'gym',         icon: '💪', label: 'חדר כושר'      },
  { id: 'accounting',  icon: '📊', label: 'ראיית חשבון'   },
  { id: 'shop',        icon: '🛍️', label: 'חנות'           },
  { id: 'startup',     icon: '🚀', label: 'סטארטאפ'       },
  { id: 'custom',      icon: '✨', label: 'אחר / מותאם אישית' },
]
const BIZ_MAP = Object.fromEntries(BIZ_TYPES.map(b => [b.id, b]))

const STYLE_MAP = {
  luxury: 'luxe', modern: 'modern', warm: 'classic',
  aggressive: 'bold', minimal: 'modern',
}

const GOAL_LABELS = {
  wa_leads: 'לידים בוואטסאפ', calls: 'שיחות טלפון',
  bookings: 'הזמנת תורים', ecommerce: 'מכירות אונליין',
}
const STYLE_LABELS = {
  luxury: 'יוקרה', modern: 'מודרני', warm: 'חם ואישי',
  aggressive: 'אגרסיבי-מכירות', minimal: 'מינימליסט',
}
const FEELING_LABELS = {
  trust: 'אמון ואמינות', prestige: 'יוקרה וסטטוס',
  speed: 'מהירות ויעילות', family: 'עסק משפחתי', highend: 'מותג גבוה',
}

const GEN_STEPS = [
  { text: 'מנתח פרופיל עסקי...',         icon: '🔍' },
  { text: 'בונה אסטרטגיה שיווקית...',    icon: '📊' },
  { text: 'מעצב זהות ויזואלית...',       icon: '🎨' },
  { text: 'כותב תוכן מקצועי בעברית...',  icon: '✍️' },
  { text: 'מגדיר מסלול לקוח חכם...',     icon: '🗺️' },
  { text: 'מוסיף אלמנטי אמון והמרה...', icon: '🏆' },
  { text: 'האתר מוכן לשיתוף! ✓',         icon: '🚀' },
]

const CINEMATIC_STEPS = [
  { icon: '🧠', title: 'מנתח את העסק שלכם',   sub: 'זיהוי קהל יעד, תחום, מיצוב תחרותי'     },
  { icon: '🎨', title: 'בוחר כיוון עיצובי',    sub: 'פלטת צבעים, טיפוגרפיה, אווירה'           },
  { icon: '✍️', title: 'כותב תוכן ממיר',        sub: 'כותרות, תיאורים, CTA — בעברית מקצועית'  },
  { icon: '📱', title: 'בונה משפך לידים',        sub: 'WhatsApp, טפסים, הודעות אוטומטיות'       },
  { icon: '🖼️', title: 'מעצב את הלייאאוט',     sub: 'סקשנים, קומפוננטים, רספונסיב מלא'        },
  { icon: '📈', title: 'מייעל להמרות',          sub: 'אותות אמינות, דחיפות, הוכחה חברתית'    },
]
const FINAL_STEP = { icon: '🚀', title: 'האתר שלכם מוכן!', sub: 'מוכן לפרסום ולהביא לקוחות אמיתיים' }

function buildAiDecisions(bizData) {
  const effectiveBizType = bizData._layoutBizType || bizData.bizType
  const bizLabel = BIZ_MAP[effectiveBizType]?.label || bizData.bizDescription || 'עסק'
  const VIBE_DESC = {
    luxury: 'כהה, זהב, אווירת פרמיום',
    modern: 'נקי, טכנולוגי, חדשני',
    warm: 'חם, ביתי, אמינות',
    aggressive: 'נועז, דרמטי, ממיר',
    minimal: 'לבן, מינימלי, מתוחכם',
  }
  const GOAL_SHORT = {
    wa_leads: 'לידים · WhatsApp',
    calls: 'שיחות טלפון',
    bookings: 'הזמנות תורים',
    ecommerce: 'מכירות אונליין',
  }
  return [
    { phase: 'ניתוח',   text: `${bizLabel} · ${bizData.city || 'ישראל'} · קהל: ${bizData.idealCustomer || 'כללי'}` },
    { phase: 'עיצוב',   text: `סגנון ${STYLE_LABELS[bizData.styleVibe] || 'מודרני'} — ${VIBE_DESC[bizData.styleVibe] || 'נקי ומקצועי'}` },
    { phase: 'כותרת',   text: `"${bizData.heroOffer || bizData.premiumService || bizLabel + ' מקצועי'}"` },
    { phase: 'CTA',     text: `${GOAL_SHORT[bizData.mainGoal] || 'ליד'} · ${bizData.differentiator ? bizData.differentiator.slice(0, 40) : 'ממיר ומשכנע'}` },
    { phase: 'תוכן',    text: bizData.differentiator ? `"${bizData.differentiator.slice(0, 55)}"` : 'תוכן שיווקי מקצועי בעברית' },
    { phase: 'אמון',    text: bizData.proofTypes?.length > 0 ? bizData.proofTypes.slice(0, 3).join(' · ') : 'ביקורות · ניסיון · אחריות' },
    { phase: '✓ מוכן',  text: `${bizData.name || bizLabel} — האתר מוכן לפרסום ולהמרות!` },
  ]
}

const QUESTIONS = [
  {
    id: 'bizType',
    ask: () => 'נתחיל! 🎯 מה סוג העסק שלכם?',
    type: 'biztype',
    react: v => v === 'custom'
      ? 'מעולה! ✨ בואו נגלה ביחד מה הכי מתאים לכם — שאלות קצרות שיעזרו לי לבנות אתר שמרגיש כאילו תוכנן במיוחד בשבילכם.'
      : `${BIZ_MAP[v]?.icon || '✨'} ${BIZ_MAP[v]?.label || v} — שוק תחרותי עם המון ביקוש. בואו נבנה עמדה שמבדלת אתכם! 🎯`,
    save: v => ({ bizType: v }),
    validate: v => !!v,
  },
  {
    id: 'details',
    ask: d => `מה שם ${BIZ_MAP[d.bizType]?.label || 'העסק'} שלכם ובאיזה אזור אתם פועלים?`,
    type: 'fields',
    fields: [
      { id: 'name', label: 'שם העסק', placeholder: 'לדוגמה: מספרת דוד, ד"ר לוי', required: true },
      { id: 'city', label: 'עיר / אזור פעילות', placeholder: 'לדוגמה: תל אביב, גוש דן', required: true },
    ],
    react: v => `"${v.name}" ב${v.city} — מצוין! עכשיו בואו ניצור נוכחות דיגיטלית שמדברת ישר אל הלקוחות שלכם. ✨`,
    save: v => ({ name: v.name, city: v.city }),
    validate: v => v?.name?.trim() && v?.city?.trim(),
    display: v => `${v.name} · ${v.city}`,
  },
  {
    id: 'idealCustomer',
    ask: () => 'מי הלקוח האידיאלי שלכם? 🎯',
    type: 'options',
    options: [
      { id: 'homeowners', label: 'בעלי בתים',    icon: '🏠' },
      { id: 'businesses', label: 'בעלי עסקים',   icon: '💼' },
      { id: 'young',      label: 'צעירים 20–35', icon: '👟' },
      { id: 'families',   label: 'משפחות',       icon: '👨‍👩‍👧' },
      { id: 'seniors',    label: 'גיל השלישי',   icon: '🌟' },
      { id: 'all',        label: 'כולם',          icon: '🌍' },
    ],
    react: () => 'מצוין! העיצוב, הטון, הכותרות — הכל יתוכנן סביב ה-DNA של הלקוח הזה. ✅',
    save: v => ({ idealCustomer: v }),
    validate: v => !!v,
  },
  {
    id: 'premiumService',
    ask: () => 'מה השירות או המוצר הכי מרשים שאתם מציעים? ⭐\nזה יופיע בכותרת הראשית של האתר.',
    type: 'text',
    placeholder: 'לדוגמה: אימון אישי VIP, פרקט אורן יוקרתי, ייעוץ ראשוני חינמי',
    react: v => `"${v}" — זה הנכס הכי חזק שלכם. כל מסלול הלקוח יבנה סביב זה! 🔥`,
    save: v => ({ premiumService: v, services: v }),
    validate: v => v?.trim()?.length > 1,
  },
  {
    id: 'differentiator',
    ask: () => 'מה מבדיל אתכם מהמתחרים? 💎\nמשפט-שניים — זה הסיפור שלכם.',
    type: 'text',
    placeholder: 'לדוגמה: אחריות 10 שנה, מגיעים תוך 24 שעות, מחירים שקופים ללא הפתעות',
    react: () => 'בדיוק זה מה שצריך לצעוק מכל עמוד. לקוח שמגיע ורואה את זה — כבר קנוי! 💫',
    save: v => ({ differentiator: v }),
    validate: v => v?.trim()?.length > 2,
  },
  {
    id: 'mainGoal',
    ask: () => 'מה המטרה הראשית של האתר? 🎯',
    type: 'options',
    options: [
      { id: 'wa_leads',  label: 'לידים בוואטסאפ', icon: '💬', desc: 'לקוחות כותבים ישירות'  },
      { id: 'calls',     label: 'שיחות טלפון',     icon: '📞', desc: 'לקוחות מתקשרים'         },
      { id: 'bookings',  label: 'הזמנת תורים',     icon: '📅', desc: 'תורים אונליין'           },
      { id: 'ecommerce', label: 'מכירות אונליין',  icon: '🛒', desc: 'חנות ותשלומים'           },
    ],
    react: v => `מעולה — כל כפתור, כל כותרת, כל עיצוב יתוכנן למקסם ${GOAL_LABELS[v] || v}. 🎯`,
    save: v => ({ mainGoal: v, goals: [v] }),
    validate: v => !!v,
  },
  {
    id: 'styleVibe',
    ask: () => 'איזה סגנון ויזואלי מתאים לעסק? 🎨',
    type: 'style',
    options: [
      { id: 'luxury',     label: 'יוקרה',            icon: '👑', desc: 'כהה, זהב, פרמיום'        },
      { id: 'modern',     label: 'מודרני',            icon: '⚡', desc: 'נקי, טכנולוגי, חד'       },
      { id: 'warm',       label: 'חם ואישי',          icon: '🏡', desc: 'חמים, אמין, ביתי'        },
      { id: 'aggressive', label: 'אגרסיבי-מכירות',    icon: '🔥', desc: 'כהה, נועז, ממיר'         },
      { id: 'minimal',    label: 'מינימליסט',          icon: '🤍', desc: 'לבן, נקי, מתוחכם'        },
    ],
    react: v => `סגנון "${STYLE_LABELS[v]}" — כבר רואה את הפלטה, הטיפוגרפיה, האנימציות. 🎨`,
    save: v => ({ styleVibe: v, style: STYLE_MAP[v] }),
    validate: v => !!v,
  },
  {
    id: 'feeling',
    ask: () => 'איזה תחושה רוצים שהאתר ייצור אצל המבקרים? 💭',
    type: 'options',
    options: [
      { id: 'trust',    label: 'אמון ואמינות',    icon: '🤝' },
      { id: 'prestige', label: 'יוקרה וסטטוס',    icon: '💎' },
      { id: 'speed',    label: 'מהירות ויעילות',  icon: '⚡' },
      { id: 'family',   label: 'עסק משפחתי חם',   icon: '❤️' },
      { id: 'highend',  label: 'מותג גבוה',        icon: '🏆' },
    ],
    react: v => `תחושת "${FEELING_LABELS[v]}" — הפלטה, העיצוב, הכותרות — הכל יכוון לזה. ✅`,
    save: v => ({ feeling: v }),
    validate: v => !!v,
  },
  {
    id: 'heroOffer',
    ask: () => 'מה ההצעה שתופיע ראשונה — מעל הקפל? 🎁\nזה מה שהופך מבקרים ללידים.',
    type: 'suggest',
    placeholder: 'כתבו את ההצעה המרכזית שלכם',
    suggestions: [
      'הצעת מחיר חינמית תוך 24 שעות',
      'ייעוץ ראשוני ללא עלות',
      'שבוע ניסיון חינמי',
      'ביקור בית / עסק חינמי',
      'התקשרו עכשיו — מענה מיידי',
    ],
    react: v => `"${v}" — ה-hook שיגרום לאנשים ללחוץ! 🚀`,
    save: v => ({ heroOffer: v }),
    validate: v => v?.trim()?.length > 2,
  },
  {
    id: 'mainObjection',
    ask: () => 'מה ההתנגדות הנפוצה ביותר של לקוחות? 🤔\n(אופציונלי — האתר יטפל בה)',
    type: 'text',
    placeholder: 'לדוגמה: "יקר מדי", "איך יודע שתעשו עבודה טובה?"',
    react: () => 'מצוין! האתר יטפל בהתנגדות הזו בעדינות. זה מגדיל המרות. ',
    save: v => ({ mainObjection: v }),
    validate: () => true,
    optional: true,
  },
  {
    id: 'proofTypes',
    ask: () => 'איזה הוכחות יש לכם? 🏆\nבחרו כל מה שרלוונטי.',
    type: 'multi',
    options: [
      { id: 'years',    label: 'שנות ניסיון',       icon: '🕐' },
      { id: 'projects', label: 'פרויקטים / עבודות', icon: '📁' },
      { id: 'reviews',  label: 'ביקורות לקוחות',    icon: '⭐' },
      { id: 'warranty', label: 'אחריות / הבטחה',    icon: '🔒' },
      { id: 'media',    label: 'כלי תקשורת',         icon: '📰' },
    ],
    react: () => 'הוכחות חזקות! האתר ייבנה סביב האמינות שלכם. 💪',
    save: v => ({ proofTypes: v }),
    validate: v => v?.length > 0,
  },
  {
    id: 'contact',
    ask: d => `כמעט סיימנו! 🎉 מספר טלפון ו-WhatsApp של ${d.name || 'העסק'} (אופציונלי)`,
    type: 'fields',
    fields: [
      { id: 'phone', label: 'טלפון', placeholder: '050-0000000', type: 'tel' },
      { id: 'waNum', label: 'WhatsApp (ספרות בלבד)', placeholder: '972501234567' },
    ],
    react: () => 'מושלם! הכל מוכן. בונה עכשיו את האתר שלכם... ✨',
    save: v => ({ phone: v.phone?.trim() || '', waNum: (v.waNum || '').replace(/\D/g, '') }),
    validate: () => true,
    optional: true,
    display: v => [v.phone, v.waNum].filter(Boolean).join(' · ') || 'ללא פרטי קשר',
  },
]

// ─── Custom business deep-interview questions ─────────────────────────
const CUSTOM_QUESTIONS = [
  {
    id: 'bizDescription',
    ask: () => 'ספרו לי — מה העסק שלכם עושה? ✨\nמה אתם מציעים ללקוחות שלכם?',
    type: 'text',
    placeholder: 'לדוגמה: קליניקת פיזיותרפיה, חברת ניקיון לעסקים, מאמן כושר אישי',
    react: v => `"${v}" — כבר רואה את האתר מתגבש. בואו נמשיך לבנות את העמדה שלכם! 🔥`,
    save: v => ({ bizDescription: v }),
    validate: v => v?.trim()?.length > 2,
  },
  {
    id: 'customCategory',
    ask: () => 'לאיזה עולם תוכן הכי קרוב העסק שלכם? 🎯\nזה יקבע את הלייאאוט, הצבעים והאווירה.',
    type: 'options',
    options: [
      { id: 'beauty',     label: 'יופי / טיפוח / בריאות',   icon: '💆' },
      { id: 'lawyer',     label: 'שירות מקצועי / ייעוץ',    icon: '👔' },
      { id: 'restaurant', label: 'אוכל / אירוח / פנאי',     icon: '🍴' },
      { id: 'gym',        label: 'ספורט / כושר / חינוך',    icon: '🏃' },
      { id: 'startup',    label: 'טכנולוגיה / מוצר דיגיטל', icon: '💻' },
      { id: 'flooring',   label: 'בנייה / שיפוץ / מלאכה',   icon: '🏠' },
    ],
    react: () => 'מצוין! הלייאאוט, הצבעים והטיפוגרפיה יותאמו לעולם שבחרתם. ✅',
    save: v => ({ _layoutBizType: v }),
    validate: v => !!v,
  },
]

function getActiveQuestions(data) {
  if (data.bizType === 'custom') {
    return [QUESTIONS[0], ...CUSTOM_QUESTIONS, ...QUESTIONS.slice(1)]
  }
  return QUESTIONS
}

// ─── Sub-components ──────────────────────────────────────────────────

function IntroScreen({ onStart }) {
  return (
    <div className="ob-intro">
      <div className="ob-intro-glow ob-intro-glow--1" />
      <div className="ob-intro-glow ob-intro-glow--2" />
      <div className="ob-intro-inner">
        <div className="ob-intro-badge">✦ BusinessBuilder AI</div>
        <h1 className="ob-intro-title">
          AI Design Director
          <span className="ob-intro-title-sub">הדירקטור לעיצוב ה-AI שלכם</span>
        </h1>
        <p className="ob-intro-desc">
          אשאל אתכם <strong>כמה שאלות קצרות</strong> — ואצור אתר שמוכר, עיצוב שמרשים,
          ואסטרטגיה שמביאה לקוחות.
        </p>
        <div className="ob-intro-features">
          {['🎨 עיצוב מותאם אישית', '✍️ תוכן בעברית', '📈 אסטרטגיית המרה', '⚡ תוך 60 שניות'].map(f => (
            <span key={f} className="ob-intro-feature">{f}</span>
          ))}
        </div>
        <button className="ob-intro-cta" onClick={onStart}>
          בואו נתחיל →
        </button>
        <p className="ob-intro-time">⏱ כ-3 דקות בלבד</p>
      </div>
    </div>
  )
}

function StreamingLine({ text, onDone }) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    let i = 0
    setShown('')
    const iv = setInterval(() => {
      i++
      setShown(text.slice(0, i))
      if (i >= text.length) { clearInterval(iv); onDone?.() }
    }, 16)
    return () => clearInterval(iv)
  }, [text]) // eslint-disable-line
  return <>{shown}{shown.length < text.length && <span className="ob-cursor">▋</span>}</>
}

function GeneratingScreen({ bizData, onComplete }) {
  const [stepIdx,   setStepIdx]   = useState(0)
  const [doneSteps, setDoneSteps] = useState([])
  const [isFinal,   setIsFinal]   = useState(false)
  const [isFlash,   setIsFlash]   = useState(false)

  useEffect(() => {
    let idx = 0
    const timers = []
    const iv = setInterval(() => {
      const step = CINEMATIC_STEPS[idx]   // snapshot before increment
      setDoneSteps(d => [...d, step])
      idx++
      if (idx >= CINEMATIC_STEPS.length) {
        clearInterval(iv)
        const t1 = setTimeout(() => setIsFinal(true), 450)
        const t2 = setTimeout(() => setIsFlash(true), 2300)
        const t3 = setTimeout(() => onComplete?.(), 2900)
        timers.push(t1, t2, t3)
      } else {
        setStepIdx(idx)
      }
    }, 1350)
    return () => { clearInterval(iv); timers.forEach(clearTimeout) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const step     = isFinal ? FINAL_STEP : CINEMATIC_STEPS[stepIdx]
  const progress = isFinal ? 100 : Math.round((stepIdx / CINEMATIC_STEPS.length) * 100)

  return (
    <div className={`ob-cinematic${isFlash ? ' ob-cinematic--flash' : ''}`}>

      {/* ── Aurora background ── */}
      <div className="ob-cine-bg" aria-hidden="true">
        <div className="ob-cine-orb ob-cine-orb--1" />
        <div className="ob-cine-orb ob-cine-orb--2" />
        <div className="ob-cine-orb ob-cine-orb--3" />
        <div className="ob-cine-grid" />
      </div>

      <div className="ob-cine-inner">
        <div className="ob-cine-brand">✦ AI Design Director</div>

        {/* ── Active step (remounts for animation) ── */}
        <div
          className={`ob-cine-step${isFinal ? ' ob-cine-step--final' : ''}`}
          key={isFinal ? 'final' : stepIdx}
        >
          <div className="ob-cine-icon-wrap">
            <div className="ob-cine-ring" />
            <div className="ob-cine-ring ob-cine-ring--delay" />
            <div className="ob-cine-icon">{step.icon}</div>
          </div>
          <h2 className="ob-cine-h2">{step.title}</h2>
          <p className="ob-cine-p">
            {isFinal && bizData.name
              ? `${bizData.name} — מוכן לפרסום!`
              : step.sub
            }
          </p>
        </div>

        {/* ── Done steps (last 3) ── */}
        {doneSteps.length > 0 && !isFinal && (
          <div className="ob-cine-done">
            {doneSteps.slice(-3).map((s, i) => (
              <div key={i} className="ob-cine-done-row">
                <span className="ob-cine-done-icon">{s.icon}</span>
                <span className="ob-cine-done-text">{s.title}</span>
                <span className="ob-cine-done-check">✓</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Progress bar ── */}
        {!isFinal && (
          <div className="ob-cine-footer">
            <div className="ob-cine-bar-wrap">
              <div className="ob-cine-bar" style={{ width: `${Math.max(2, progress)}%` }} />
            </div>
            <span className="ob-cine-pct">{progress}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

function AiMessage({ text }) {
  return (
    <div className="ob-msg ob-msg--ai">
      <div className="ob-msg-avatar" aria-hidden="true">✦</div>
      <div className="ob-bubble ob-bubble--ai">
        {text.split('\n').map((line, i) => (
          <span key={i}>{line}{i < text.split('\n').length - 1 && <br />}</span>
        ))}
      </div>
    </div>
  )
}

function UserMessage({ text }) {
  return (
    <div className="ob-msg ob-msg--user">
      <div className="ob-bubble ob-bubble--user">{text}</div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="ob-msg ob-msg--ai">
      <div className="ob-msg-avatar" aria-hidden="true">✦</div>
      <div className="ob-bubble ob-bubble--ai ob-bubble--typing">
        <span /><span /><span />
      </div>
    </div>
  )
}

// ─── Question input renderer ─────────────────────────────────────────

function QuestionInput({ q, textVal, setTextVal, fieldVals, setFieldVals, multiSel, setMultiSel, onAnswer, onSkip }) {

  if (q.type === 'biztype') {
    return (
      <div className="ob-input-area">
        <div className="ob-biztype-grid">
          {BIZ_TYPES.map(b => (
            <button
              key={b.id}
              className={`ob-biztype-btn${b.id === 'custom' ? ' ob-biztype-btn--custom' : ''}`}
              onClick={() => onAnswer(b.id, `${b.icon} ${b.label}`)}
            >
              <span className="ob-biztype-icon">{b.icon}</span>
              <span className="ob-biztype-label">{b.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (q.type === 'options') {
    return (
      <div className="ob-input-area">
        <div className="ob-options-grid">
          {q.options.map(o => (
            <button
              key={o.id}
              className="ob-option-btn"
              onClick={() => onAnswer(o.id, `${o.icon} ${o.label}`)}
            >
              <span className="ob-option-icon">{o.icon}</span>
              <span className="ob-option-label">{o.label}</span>
              {o.desc && <span className="ob-option-desc">{o.desc}</span>}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (q.type === 'style') {
    return (
      <div className="ob-input-area">
        <div className="ob-style-grid">
          {q.options.map(o => (
            <button
              key={o.id}
              className="ob-style-option"
              onClick={() => onAnswer(o.id, `${o.icon} ${o.label}`)}
            >
              <span className="ob-style-opt-icon">{o.icon}</span>
              <div className="ob-style-opt-label">{o.label}</div>
              <div className="ob-style-opt-desc">{o.desc}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (q.type === 'multi') {
    const toggle = id =>
      setMultiSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
    const labels = multiSel.map(id => {
      const o = q.options.find(x => x.id === id)
      return o ? `${o.icon} ${o.label}` : id
    }).join(' · ')

    return (
      <div className="ob-input-area">
        <div className="ob-multi-grid">
          {q.options.map(o => (
            <button
              key={o.id}
              className={`ob-multi-btn${multiSel.includes(o.id) ? ' selected' : ''}`}
              onClick={() => toggle(o.id)}
            >
              {multiSel.includes(o.id) && <span className="ob-multi-check">✓</span>}
              <span>{o.icon}</span>
              <span>{o.label}</span>
            </button>
          ))}
        </div>
        <div className="ob-input-row">
          <button
            className="ob-submit-btn"
            disabled={multiSel.length === 0}
            onClick={() => onAnswer(multiSel, labels || 'לא נבחר')}
          >
            המשך →
          </button>
        </div>
      </div>
    )
  }

  if (q.type === 'fields') {
    const submit = () => {
      if (!q.validate(fieldVals)) return
      const displayText = q.display ? q.display(fieldVals)
        : q.fields.map(f => fieldVals[f.id] || '').filter(Boolean).join(' · ')
      onAnswer(fieldVals, displayText || 'המשך')
    }
    return (
      <div className="ob-input-area">
        <div className="ob-fields-wrap">
          {q.fields.map(f => (
            <label key={f.id} className="ob-field">
              <span className="ob-field-lbl">{f.label}</span>
              <input
                className="ob-field-input"
                type={f.type || 'text'}
                placeholder={f.placeholder}
                value={fieldVals[f.id] || ''}
                onChange={e => setFieldVals(fv => ({ ...fv, [f.id]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') submit() }}
              />
            </label>
          ))}
        </div>
        <div className="ob-input-row">
          {q.optional && (
            <button className="ob-skip-btn" onClick={onSkip}>דלג</button>
          )}
          <button
            className="ob-submit-btn"
            disabled={!q.validate(fieldVals)}
            onClick={submit}
          >
            המשך →
          </button>
        </div>
      </div>
    )
  }

  if (q.type === 'text') {
    const submit = () => {
      if (!textVal.trim()) return
      onAnswer(textVal.trim(), textVal.trim())
    }
    return (
      <div className="ob-input-area">
        <div className="ob-text-wrap">
          <input
            className="ob-field-input ob-text-input"
            placeholder={q.placeholder}
            value={textVal}
            onChange={e => setTextVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            autoFocus
          />
        </div>
        <div className="ob-input-row">
          {q.optional && (
            <button className="ob-skip-btn" onClick={onSkip}>דלג</button>
          )}
          <button
            className="ob-submit-btn"
            disabled={!q.validate(textVal)}
            onClick={submit}
          >
            המשך →
          </button>
        </div>
      </div>
    )
  }

  if (q.type === 'suggest') {
    const submit = () => {
      if (!textVal.trim()) return
      onAnswer(textVal.trim(), textVal.trim())
    }
    return (
      <div className="ob-input-area">
        <div className="ob-suggestions-row">
          {q.suggestions.map(s => (
            <button key={s} className="ob-suggest-chip" onClick={() => setTextVal(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="ob-text-wrap">
          <input
            className="ob-field-input ob-text-input"
            placeholder={q.placeholder}
            value={textVal}
            onChange={e => setTextVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
          />
        </div>
        <div className="ob-input-row">
          <button
            className="ob-submit-btn"
            disabled={!q.validate(textVal)}
            onClick={submit}
          >
            המשך →
          </button>
        </div>
      </div>
    )
  }

  return null
}

// ─── Main component ──────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [phase, setPhase]       = useState('intro')
  const [messages, setMessages] = useState([])
  const [qIdx, setQIdx]         = useState(0)
  const [typing, setTyping]     = useState(false)
  const [awaitInput, setAwait]  = useState(false)
  const [fieldVals, setFields]  = useState({})
  const [multiSel, setMulti]    = useState([])
  const [textVal, setText]      = useState('')
  const [genStep, setGenStep]   = useState(0)
  const [bizData, setBizData]   = useState({})
  const msgsRef = useRef(null)

  useEffect(() => {
    if (msgsRef.current) {
      const el = msgsRef.current
      el.scrollTop = el.scrollHeight
    }
  }, [messages, typing])

  function addAiMsg(text, delay = 900) {
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages(m => [...m, { id: Date.now(), role: 'ai', text }])
      setAwait(true)
    }, delay)
  }

  function handleAnswer(val, displayText) {
    const activeQs = getActiveQuestions(bizData)
    const q = activeQs[qIdx]
    setMessages(m => [...m, { id: Date.now() + 1, role: 'user', text: displayText || String(val) }])
    setAwait(false)
    setText('')
    setFields({})
    setMulti([])

    const saved = q.save(val)
    const newData = { ...bizData, ...saved }
    setBizData(newData)

    const newQs = getActiveQuestions(newData)
    const nextIdx = qIdx + 1
    const isLast = nextIdx >= newQs.length
    const reaction = q.react(val, newData)

    setTimeout(() => {
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        setMessages(m => [...m, { id: Date.now() + 2, role: 'ai', text: reaction }])
        if (isLast) {
          setTimeout(() => startGenerating(newData), 700)
        } else {
          setQIdx(nextIdx)
          const nextQ = newQs[nextIdx]
          setTimeout(() => addAiMsg(nextQ.ask(newData), 800), 300)
        }
      }, 700)
    }, 200)
  }

  function handleSkip() {
    const activeQs = getActiveQuestions(bizData)
    const q = activeQs[qIdx]
    const saved = q.save('', bizData)
    const newData = { ...bizData, ...saved }
    setBizData(newData)
    setAwait(false)
    setText('')
    setFields({})
    setMulti([])
    const newQs = getActiveQuestions(newData)
    const nextIdx = qIdx + 1
    if (nextIdx >= newQs.length) {
      startGenerating(newData)
    } else {
      setQIdx(nextIdx)
      setTimeout(() => addAiMsg(newQs[nextIdx].ask(newData), 600), 200)
    }
  }

  function startGenerating(finalData) {
    try {
      localStorage.setItem('saas_biz', JSON.stringify(finalData))
      localStorage.setItem('bb_ready', '1')
    } catch {}
    setBizData(finalData)
    setPhase('generating')
  }

  function startChat() {
    setPhase('chat')
    setMessages([])
    setQIdx(0)
    setTimeout(() => {
      setMessages([{
        id: Date.now(),
        role: 'ai',
        text: 'שלום! אני ה-AI Design Director שלכם. 🎨\n\nאני אשאל אתכם כמה שאלות קצרות ואצור אתר שמוכר, עיצוב שמרשים, ואסטרטגיה שמביאה לקוחות.\n\nמוכנים?',
      }])
      setTimeout(() => setAwait(true), 200)
    }, 300)

    // schedule first real question after greeting dismissed
    // (actually we show it inline — first awaitInput is just the intro msg, but we skip a special q)
    // simpler: show intro msg + immediately show Q0 input (no separate "ready" step)
    // re-think: just show greeting + Q0 message together
  }

  // Simplified: greet + show first question immediately
  function startChatSimple() {
    setPhase('chat')
    setMessages([])
    setQIdx(0)
    const greeting = 'שלום! אני ה-AI Design Director שלכם 🎨\n\nב-3 דקות נצור ביחד: אתר שמוכר, עיצוב שמרשים, ואסטרטגיה שמביאה לקוחות אמיתיים.\n\nנתחיל בשאלה הכי חשובה:'
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages([{ id: Date.now(), role: 'ai', text: greeting }])
      setTimeout(() => addAiMsg(QUESTIONS[0].ask({}), 600), 300)
    }, 800)
  }

  if (phase === 'intro') return <IntroScreen onStart={startChatSimple} />
  if (phase === 'generating') return <GeneratingScreen bizData={bizData} onComplete={() => navigate('/preview')} />

  const activeQs = getActiveQuestions(bizData)
  const currentQ = activeQs[qIdx]
  const progress = Math.round((qIdx / activeQs.length) * 100)

  return (
    <div className="ob-chat-root">

      {/* Header */}
      <header className="ob-chat-header">
        <div className="ob-chat-logo">
          <span className="ob-chat-logo-diamond">✦</span>
          <span>BusinessBuilder <span className="ob-chat-logo-ai">AI</span></span>
        </div>
        <div className="ob-chat-progress-wrap">
          <span className="ob-chat-q-num">{qIdx + 1} / {activeQs.length}</span>
          <div className="ob-chat-progress-bar">
            <div className="ob-chat-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="ob-chat-msgs" ref={msgsRef}>
        {messages.map(m =>
          m.role === 'ai'
            ? <AiMessage key={m.id} text={m.text} />
            : <UserMessage key={m.id} text={m.text} />
        )}
        {typing && <TypingBubble />}
        <div className="ob-chat-msgs-end" />
      </div>

      {/* Input area */}
      {awaitInput && currentQ && (
        <QuestionInput
          q={currentQ}
          textVal={textVal}
          setTextVal={setText}
          fieldVals={fieldVals}
          setFieldVals={setFields}
          multiSel={multiSel}
          setMultiSel={setMulti}
          bizData={bizData}
          onAnswer={handleAnswer}
          onSkip={handleSkip}
        />
      )}
    </div>
  )
}
