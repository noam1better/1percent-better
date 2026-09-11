// Daily standalone lesson recommendation and persistence service.
// One lesson per calendar day, stable across refreshes.
// Topic preference respected; lessons don't repeat within 30 days when pool is large enough.

import { DAILY_LESSONS, getLessonsByTopic, LESSON_TOPICS } from '../data/dailyLessons'

const LOG_KEY   = 'prime_lesson_log'   // array of { date, lessonId, topicId, openedAt, completedAt, appliedAt, feedback }
const TODAY_KEY = 'prime_lesson_today' // { date, lessonId, topicId }

function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY)) || [] }
  catch { return [] }
}

function saveLog(log) {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 60))) } catch {}
}

function loadToday() {
  try { return JSON.parse(localStorage.getItem(TODAY_KEY)) } catch { return null }
}

function saveToday(entry) {
  try { localStorage.setItem(TODAY_KEY, JSON.stringify(entry)) } catch {}
}

// IDs of lessons shown in the last N days (to prevent repeats)
function getRecentIds(nDays = 30) {
  const cutoff = new Date(Date.now() - nDays * 86_400_000)
  const cutoffKey = localDateKey(cutoff)
  return new Set(
    loadLog()
      .filter(e => e.date >= cutoffKey)
      .map(e => e.lessonId)
  )
}

// Pick a lesson for a given topic, avoiding recently-seen IDs.
// Falls back to any lesson in the topic if all are recent (small pool).
function pickLesson(topicId, excludeIds, seed) {
  const pool = getLessonsByTopic(topicId)
  const fresh = pool.filter(l => !excludeIds.has(l.id))
  const candidates = fresh.length > 0 ? fresh : pool
  return candidates[seed % candidates.length]
}

// Day-of-year as a stable seed (same day → same pick)
function dayOfYear(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const start = new Date(y, 0, 0)
  const date  = new Date(y, m - 1, d)
  return Math.floor((date - start) / 86_400_000)
}

// Get the preferred topic ID from UserContext prefs (passed in) or rotate by day
function resolveTopicId(prefTopics, dateKey) {
  if (prefTopics && prefTopics.length > 0) {
    const doy = dayOfYear(dateKey)
    return prefTopics[doy % prefTopics.length]
  }
  const doy = dayOfYear(dateKey)
  return LESSON_TOPICS[doy % LESSON_TOPICS.length].id
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Returns today's assigned lesson. Stable: returns the same lesson for the same calendar day.
 * @param {string[]} prefTopics  — user's preferred topic IDs (from UserContext), may be empty
 * @returns {{ lesson, topicId, isNew: boolean }}
 */
export function getTodayLesson(prefTopics = []) {
  const today = localDateKey()
  const saved = loadToday()

  // Already assigned today
  if (saved?.date === today && DAILY_LESSONS.find(l => l.id === saved.lessonId)) {
    return {
      lesson: DAILY_LESSONS.find(l => l.id === saved.lessonId),
      topicId: saved.topicId,
      isNew: false,
    }
  }

  // Assign a new lesson for today
  const recentIds = getRecentIds(30)
  const topicId   = resolveTopicId(prefTopics, today)
  const seed      = dayOfYear(today)
  const lesson    = pickLesson(topicId, recentIds, seed)

  const entry = { date: today, lessonId: lesson.id, topicId }
  saveToday(entry)

  // Add to log (don't duplicate same day)
  const log = loadLog().filter(e => e.date !== today)
  saveLog([{ ...entry, openedAt: null, completedAt: null, appliedAt: null, feedback: null }, ...log])

  return { lesson, topicId, isNew: true }
}

/**
 * Request an alternative lesson for today (user tapped "לבחור נושא אחר").
 * Picks a different lesson from the SAME topic, or a random different topic if pool exhausted.
 * @param {string} currentLessonId  — the lesson currently shown
 * @param {string[]} prefTopics
 * @returns {{ lesson, topicId }}
 */
export function getAlternativeLesson(currentLessonId, prefTopics = []) {
  const today = localDateKey()
  const recentIds = new Set([...getRecentIds(30), currentLessonId])

  // Try same topic first
  const saved = loadToday()
  const topicId = saved?.topicId || resolveTopicId(prefTopics, today)
  const seed = (dayOfYear(today) + 7) % 1000  // offset for variety

  const sameTopicPool = getLessonsByTopic(topicId).filter(l => l.id !== currentLessonId && !recentIds.has(l.id))
  if (sameTopicPool.length > 0) {
    const lesson = sameTopicPool[seed % sameTopicPool.length]
    const entry = { date: today, lessonId: lesson.id, topicId }
    saveToday(entry)
    const log = loadLog().filter(e => e.date !== today)
    saveLog([{ ...entry, openedAt: null, completedAt: null, appliedAt: null, feedback: null }, ...log])
    return { lesson, topicId }
  }

  // Fall back: try a different topic
  for (const t of LESSON_TOPICS) {
    if (t.id === topicId) continue
    const pool = getLessonsByTopic(t.id).filter(l => !recentIds.has(l.id))
    if (pool.length > 0) {
      const lesson = pool[seed % pool.length]
      const entry = { date: today, lessonId: lesson.id, topicId: t.id }
      saveToday(entry)
      const log = loadLog().filter(e => e.date !== today)
      saveLog([{ ...entry, openedAt: null, completedAt: null, appliedAt: null, feedback: null }, ...log])
      return { lesson, topicId: t.id }
    }
  }

  // Absolute fallback: any lesson that isn't the current one
  const fallback = DAILY_LESSONS.find(l => l.id !== currentLessonId) || DAILY_LESSONS[0]
  return { lesson: fallback, topicId: fallback.topicId }
}

/** Mark lesson as opened (does not count as completion). Idempotent. */
export function markLessonOpened(lessonId) {
  const today = localDateKey()
  const log = loadLog()
  const idx = log.findIndex(e => e.date === today && e.lessonId === lessonId)
  if (idx === -1) return
  if (!log[idx].openedAt) {
    log[idx] = { ...log[idx], openedAt: Date.now() }
    saveLog(log)
  }
}

/** Mark lesson as completed (user scrolled through / answered question). Idempotent. Returns true if first time. */
export function markLessonCompleted(lessonId) {
  const today = localDateKey()
  const log = loadLog()
  const idx = log.findIndex(e => e.date === today && e.lessonId === lessonId)
  if (idx === -1) return false
  if (log[idx].completedAt) return false  // already completed
  log[idx] = { ...log[idx], completedAt: Date.now() }
  saveLog(log)
  return true
}

/** Mark lesson action as applied. Idempotent. Returns true if first time. */
export function markLessonApplied(lessonId) {
  const today = localDateKey()
  const log = loadLog()
  const idx = log.findIndex(e => e.date === today && e.lessonId === lessonId)
  if (idx === -1) return false
  if (log[idx].appliedAt) return false
  log[idx] = { ...log[idx], appliedAt: Date.now() }
  saveLog(log)
  return true
}

/** Save "עוד כאלה" or "פחות מתאים לי" feedback for a lesson. */
export function saveLessonFeedback(lessonId, feedback) {
  const today = localDateKey()
  const log = loadLog()
  const idx = log.findIndex(e => e.date === today && e.lessonId === lessonId)
  if (idx === -1) return
  log[idx] = { ...log[idx], feedback }
  saveLog(log)

  // Persist topic feedback to influence future selection
  try {
    const topicFeedback = JSON.parse(localStorage.getItem('prime_lesson_topic_feedback') || '{}')
    const topicId = log[idx].topicId
    const counts = topicFeedback[topicId] || { more: 0, less: 0 }
    if (feedback === 'more') counts.more = (counts.more || 0) + 1
    if (feedback === 'less') counts.less = (counts.less || 0) + 1
    topicFeedback[topicId] = counts
    localStorage.setItem('prime_lesson_topic_feedback', JSON.stringify(topicFeedback))
  } catch {}
}

/** Get today's lesson log entry (for displaying status). */
export function getTodayLessonEntry() {
  const today = localDateKey()
  return loadLog().find(e => e.date === today) || null
}

/** Returns topic feedback summary: { topicId: { more, less } } */
export function getTopicFeedback() {
  try { return JSON.parse(localStorage.getItem('prime_lesson_topic_feedback') || '{}') }
  catch { return {} }
}
