import { GoogleGenerativeAI } from '@google/generative-ai'
import { getEnergyLog, ENERGY_TAGS } from './energyLogService'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const genAI   = API_KEY ? new GoogleGenerativeAI(API_KEY) : null
const KEY     = 'prime_weekly_spark'
const TTL     = 20 * 60 * 60 * 1000  // 20 hours

function tagLabel(id) {
  return ENERGY_TAGS.find(t => t.id === id)?.label || id
}

function buildFallback(log) {
  if (!log.length) return 'כל יום שאתה מתחייב — אתה בונה גרסה טובה יותר של עצמך.'
  const counts = { electric: 0, focused: 0, drained: 0 }
  log.forEach(e => { if (e.tag in counts) counts[e.tag]++ })
  const [top] = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (top[0] === 'electric') return 'כשאתה בא מלא אנרגיה — אתה בלתי ניתן לעצירה. שמור על הדלק הזה.'
  if (top[0] === 'focused')  return 'המיקוד שלך הוא הנשק הכי חזק שלך. יום ממוקד שווה שלושה ימים רגילים.'
  return 'גם ביום המרוקן ביותר — העצם שאתה כאן בונה חוסן שלא רואים עכשיו, אבל ירגישו בהמשך.'
}

function buildPrompt(log, completedDays) {
  const lines = log.map(e => `${e.date}: ${tagLabel(e.tag)}`).join('\n')
  return (
    `אתה מאמן ביצועים. המשתמש השלים ${completedDays} ימים בשבוע האחרון.\n` +
    `אנרגיית הימים:\n${lines || 'אין נתונים'}\n\n` +
    `כתוב משפט אחד בלבד בעברית — תובנה חדה ומעצימה על הדפוס שאתה רואה.\n` +
    `חוקים: אין שאלות, אין "האם", אין האשמה. מקסימום 20 מילה. החזר רק המשפט, ללא מרכאות חיצוניות.`
  )
}

export function getCachedSpark() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY))
    if (c && Date.now() - c.ts < TTL) return c.spark
  } catch {}
  return null
}

export function invalidateSpark() {
  try { localStorage.removeItem(KEY) } catch {}
}

export async function generateWeeklySpark(completedDays = 0) {
  const cached = getCachedSpark()
  if (cached) return cached

  const log = getEnergyLog(7)

  if (!genAI) return buildFallback(log)

  try {
    const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await Promise.race([
      model.generateContent(buildPrompt(log, completedDays)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ])
    const spark = result.response.text().trim().replace(/^["״]|["״]$/g, '')
    if (!spark || spark.length < 10) throw new Error('empty')
    localStorage.setItem(KEY, JSON.stringify({ spark, ts: Date.now() }))
    return spark
  } catch {
    return buildFallback(log)
  }
}
