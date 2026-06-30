import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const genAI   = new GoogleGenerativeAI(API_KEY)

const LOG_KEY = 'prime_coaching_log'
const TODAY   = () => new Date().toISOString().slice(0, 10)

const FALLBACKS = [
  'כל יום שאתה לא מתקדם, מישהו אחר כן. תבחר.',
  'המשמעת אינה רגש — היא החלטה. קבל אותה עכשיו.',
  'תירוצים קיימים. תוצאות גם כן. מה אתה מביא היום?',
  'הרצף לא יישמר מעצמו. רק אתה יכול לשמור עליו.',
  'השינוי לא מרגיש טוב בהתחלה. עשה אותו בכל מקרה.',
  'מי שמחכה לרגע הנכון לא מגיע לשום מקום. הרגע הוא עכשיו.',
  'אתה לא מתאמן כדי להרגיש טוב. אתה מתאמן כדי להיות טוב.',
]

function loadLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY)) || [] }
  catch { return [] }
}

function saveLog(log) {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 30))) } catch {}
}

export function getTodaysEntry() {
  return loadLog().find(e => e.date === TODAY()) || null
}

export function shouldGenerate() {
  const hour = new Date().getHours()
  return hour >= 8 && !getTodaysEntry()
}

export function getRecentLog(n = 5) {
  return loadLog().slice(0, n)
}

function gatherContext() {
  const today = TODAY()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  let score = 0, rankLabel = 'RECRUIT', streak = 0, missedDays = 0
  let disciplineGoal = '', disciplineActivity = ''
  let activeTrackName = ''

  try {
    const sv = JSON.parse(localStorage.getItem('prime_score_v1'))
    score = sv?.score || 0
    const RANKS = [
      { min: 450, label: 'PRIME' }, { min: 200, label: 'ELITE' },
      { min: 75,  label: 'OPERATOR' }, { min: 0, label: 'RECRUIT' },
    ]
    rankLabel = RANKS.find(r => score >= r.min)?.label || 'RECRUIT'
  } catch {}

  try {
    const ds = JSON.parse(localStorage.getItem('prime_discipline_state'))
    if (ds) {
      disciplineGoal = ds.goalMinutes
      disciplineActivity = ds.activity
      const history = ds.history || []
      // streak from consecutive completed days
      const completed = [...history].filter(h => h.completed).sort((a, b) => b.date.localeCompare(a.date))
      if (completed.length) {
        let expected = completed[0].date === today ? today : yesterday
        for (const e of completed) {
          if (e.date === expected) {
            streak++
            const d = new Date(expected); d.setDate(d.getDate() - 1)
            expected = d.toISOString().slice(0, 10)
          } else break
        }
      }
      // missed days in last 7
      const last7 = history.filter(h => {
        const d = new Date(today); d.setDate(d.getDate() - 7)
        return h.date >= d.toISOString().slice(0, 10)
      })
      missedDays = last7.filter(h => !h.completed).length
    }
  } catch {}

  try {
    const ts = JSON.parse(localStorage.getItem('prime_training_state'))
    const enrolled = ts?.enrolledTrackIds || []
    if (enrolled.length) activeTrackName = enrolled[0].replace('cardio-', '').replace('strength-', '')
  } catch {}

  return { score, rankLabel, streak, missedDays, disciplineGoal, disciplineActivity, activeTrackName }
}

export async function generateDailyMessage() {
  const ctx = gatherContext()

  const {
    score, rankLabel, streak, missedDays,
    disciplineGoal, disciplineActivity, activeTrackName,
  } = ctx

  const fallback = FALLBACKS[new Date().getDate() % FALLBACKS.length]

  if (!API_KEY || API_KEY === 'YOUR_KEY_HERE') {
    const entry = {
      date: TODAY(),
      message: fallback,
      generatedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      ...ctx,
    }
    const log = loadLog().filter(e => e.date !== TODAY())
    saveLog([entry, ...log])
    return entry
  }

  const goalsLine = disciplineGoal
    ? `- מטרה יומית: ${disciplineGoal} דקות ${disciplineActivity}`
    : ''
  const trackLine = activeTrackName
    ? `- מסלול אימון פעיל: ${activeTrackName}`
    : ''

  const prompt =
    `אתה מאמן משמעת אישי נוקשה — לא מחמיא, לא מנחם.\n` +
    `כתוב מסר בוקר יומי למשתמש בעברית. 2–3 משפטים בלבד.\n\n` +
    `נתוני המשתמש:\n` +
    `- דירוג: ${rankLabel} (ציון: ${score})\n` +
    `- רצף ימים: ${streak}\n` +
    `- ימים שפוספסו ב-7 ימים האחרונים: ${missedDays}\n` +
    (goalsLine ? goalsLine + '\n' : '') +
    (trackLine ? trackLine + '\n' : '') +
    `\nכללים:\n` +
    `- אם missedDays >= 3: תעמת ישירות עם הדפוס. אל תתעלם.\n` +
    `- אם streak >= 7: אתגר לשמור עליו — לא לנוח על הפרסים.\n` +
    `- אם streak === 0: קרא לפעולה מיידית, ספציפית.\n` +
    `- אם rankLabel === 'RECRUIT': ציין שהוא עדיין בהתחלה — יש עוד לאן ללכת.\n` +
    `- אם rankLabel === 'PRIME': בר קיימא? הוכח שזה לא מזל.\n` +
    `- ללא markdown. ללא כוכביות. ישיר. ממוקד. ממשי.`

  try {
    const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(prompt)
    const message = result.response.text().trim()

    const entry = {
      date: TODAY(),
      message,
      generatedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      ...ctx,
    }
    const log = loadLog().filter(e => e.date !== TODAY())
    saveLog([entry, ...log])
    return entry
  } catch {
    const entry = {
      date: TODAY(),
      message: fallback,
      generatedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      ...ctx,
    }
    const log = loadLog().filter(e => e.date !== TODAY())
    saveLog([entry, ...log])
    return entry
  }
}
