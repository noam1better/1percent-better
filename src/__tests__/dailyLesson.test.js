import { describe, it, expect, beforeEach, vi } from 'vitest'

// Stub localStorage before importing the service
const store = {}
const localStorageMock = {
  getItem:    key       => store[key] ?? null,
  setItem:    (key, v)  => { store[key] = v },
  removeItem: key       => { delete store[key] },
  clear:      ()        => { Object.keys(store).forEach(k => delete store[k]) },
}
vi.stubGlobal('localStorage', localStorageMock)

import {
  getTodayLesson,
  getAlternativeLesson,
  markLessonOpened,
  markLessonCompleted,
  markLessonApplied,
  saveLessonFeedback,
  getTodayLessonEntry,
  getTopicFeedback,
} from '../services/dailyLessonService'
import { DAILY_LESSONS, LESSON_TOPICS } from '../data/dailyLessons'

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function tomorrowKey() {
  const d = new Date(Date.now() + 86_400_000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

beforeEach(() => {
  localStorageMock.clear()
})

// ── 1. Selection — stable within one day ──────────────────────────

describe('lesson selection', () => {
  it('returns same lesson on repeated calls (stable per day)', () => {
    const { lesson: a } = getTodayLesson()
    const { lesson: b } = getTodayLesson()
    expect(a.id).toBe(b.id)
  })

  it('returns valid lesson object with required fields', () => {
    const { lesson } = getTodayLesson()
    expect(lesson.id).toBeTruthy()
    expect(lesson.topicId).toBeTruthy()
    expect(lesson.titleHe).toBeTruthy()
    expect(lesson.ideaHe).toBeTruthy()
    expect(lesson.explanationHe).toBeTruthy()
    expect(lesson.exampleHe).toBeTruthy()
    expect(lesson.questionHe).toBeTruthy()
    expect(lesson.answerHe).toBeTruthy()
  })

  it('returns isNew=true on first call of day', () => {
    const { isNew } = getTodayLesson()
    expect(isNew).toBe(true)
  })

  it('returns isNew=false on subsequent calls same day', () => {
    getTodayLesson()
    const { isNew } = getTodayLesson()
    expect(isNew).toBe(false)
  })

  it('topic matches a valid topic ID', () => {
    const { topicId } = getTodayLesson()
    const validIds = LESSON_TOPICS.map(t => t.id)
    expect(validIds).toContain(topicId)
  })

  it('respects prefTopics — picks from preferred topic', () => {
    const prefTopic = LESSON_TOPICS[0].id
    const { topicId } = getTodayLesson([prefTopic])
    expect(topicId).toBe(prefTopic)
  })
})

// ── 2. Alternative lesson ─────────────────────────────────────────

describe('getAlternativeLesson', () => {
  it('returns a different lesson from the current one', () => {
    const { lesson: orig } = getTodayLesson()
    const { lesson: alt } = getAlternativeLesson(orig.id)
    expect(alt.id).not.toBe(orig.id)
  })

  it('returns a valid lesson object', () => {
    const { lesson: orig } = getTodayLesson()
    const { lesson: alt } = getAlternativeLesson(orig.id)
    expect(alt.titleHe).toBeTruthy()
    expect(alt.topicId).toBeTruthy()
  })

  it('updates today storage to the new lesson', () => {
    const { lesson: orig } = getTodayLesson()
    const { lesson: alt } = getAlternativeLesson(orig.id)
    const { lesson: current } = getTodayLesson()
    expect(current.id).toBe(alt.id)
  })
})

// ── 3. Repeat prevention ──────────────────────────────────────────

describe('repeat prevention', () => {
  it('lesson pool covers all topic IDs', () => {
    for (const topic of LESSON_TOPICS) {
      const lessons = DAILY_LESSONS.filter(l => l.topicId === topic.id)
      expect(lessons.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('different calls for all topics return valid lessons without throwing', () => {
    for (const topic of LESSON_TOPICS) {
      expect(() => getTodayLesson([topic.id])).not.toThrow()
      localStorageMock.clear()
    }
  })
})

// ── 4. Marking and log ────────────────────────────────────────────

describe('lesson marking', () => {
  it('markLessonOpened does not mark as completed', () => {
    const { lesson } = getTodayLesson()
    markLessonOpened(lesson.id)
    const entry = getTodayLessonEntry()
    expect(entry.openedAt).toBeTruthy()
    expect(entry.completedAt).toBeNull()
  })

  it('markLessonCompleted returns true on first completion', () => {
    const { lesson } = getTodayLesson()
    const result = markLessonCompleted(lesson.id)
    expect(result).toBe(true)
  })

  it('markLessonCompleted returns false on re-completion (idempotent)', () => {
    const { lesson } = getTodayLesson()
    markLessonCompleted(lesson.id)
    const result2 = markLessonCompleted(lesson.id)
    expect(result2).toBe(false)
  })

  it('markLessonApplied returns true on first application', () => {
    const { lesson } = getTodayLesson()
    const result = markLessonApplied(lesson.id)
    expect(result).toBe(true)
  })

  it('markLessonApplied returns false on repeat', () => {
    const { lesson } = getTodayLesson()
    markLessonApplied(lesson.id)
    expect(markLessonApplied(lesson.id)).toBe(false)
  })

  it('markLessonOpened is idempotent — openedAt does not change on second call', () => {
    const { lesson } = getTodayLesson()
    markLessonOpened(lesson.id)
    const first = getTodayLessonEntry().openedAt
    markLessonOpened(lesson.id)
    expect(getTodayLessonEntry().openedAt).toBe(first)
  })

  it('opening alone does NOT complete the lesson', () => {
    const { lesson } = getTodayLesson()
    markLessonOpened(lesson.id)
    expect(getTodayLessonEntry().completedAt).toBeNull()
  })
})

// ── 5. Feedback ───────────────────────────────────────────────────

describe('lesson feedback', () => {
  it('saves "more" feedback to log entry', () => {
    const { lesson } = getTodayLesson()
    saveLessonFeedback(lesson.id, 'more')
    expect(getTodayLessonEntry().feedback).toBe('more')
  })

  it('saves "less" feedback to log entry', () => {
    const { lesson } = getTodayLesson()
    saveLessonFeedback(lesson.id, 'less')
    expect(getTodayLessonEntry().feedback).toBe('less')
  })

  it('topic feedback accumulates across calls', () => {
    const { lesson } = getTodayLesson()
    saveLessonFeedback(lesson.id, 'more')
    const fb = getTopicFeedback()
    expect(fb[lesson.topicId].more).toBeGreaterThanOrEqual(1)
  })

  it('"less" feedback increments less count', () => {
    const { lesson } = getTodayLesson()
    saveLessonFeedback(lesson.id, 'less')
    const fb = getTopicFeedback()
    expect(fb[lesson.topicId].less).toBeGreaterThanOrEqual(1)
  })
})

// ── 6. getTodayLessonEntry ────────────────────────────────────────

describe('getTodayLessonEntry', () => {
  it('returns null when no lesson assigned today', () => {
    expect(getTodayLessonEntry()).toBeNull()
  })

  it('returns entry with today date after assignment', () => {
    getTodayLesson()
    const entry = getTodayLessonEntry()
    expect(entry).not.toBeNull()
    expect(entry.date).toBe(todayKey())
  })

  it('entry has expected shape', () => {
    const { lesson } = getTodayLesson()
    const entry = getTodayLessonEntry()
    expect(entry.lessonId).toBe(lesson.id)
    expect(entry.topicId).toBeTruthy()
    expect(entry).toHaveProperty('openedAt')
    expect(entry).toHaveProperty('completedAt')
    expect(entry).toHaveProperty('appliedAt')
    expect(entry).toHaveProperty('feedback')
  })
})

// ── 7. Daily rollover ─────────────────────────────────────────────

describe('daily rollover', () => {
  it('simulated rollover: stale today entry triggers new assignment', () => {
    // Assign lesson for "yesterday" manually
    const yesterday = new Date(Date.now() - 86_400_000)
    const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    const staleEntry = { date: yKey, lessonId: DAILY_LESSONS[0].id, topicId: DAILY_LESSONS[0].topicId }
    localStorageMock.setItem('prime_lesson_today', JSON.stringify(staleEntry))

    // getTodayLesson should detect the date mismatch and assign fresh
    const { lesson, isNew } = getTodayLesson()
    expect(isNew).toBe(true)
    expect(lesson.id).toBeTruthy()
    const entry = getTodayLessonEntry()
    expect(entry.date).toBe(todayKey())
  })
})

// ── 8. Duplicate XP prevention (structural) ───────────────────────

describe('duplicate XP prevention', () => {
  it('markLessonCompleted returns false on second call — XP should only be awarded once', () => {
    const { lesson } = getTodayLesson()
    const first  = markLessonCompleted(lesson.id)
    const second = markLessonCompleted(lesson.id)
    expect(first).toBe(true)
    expect(second).toBe(false)
  })

  it('markLessonApplied returns false on second call — bonus XP only once', () => {
    const { lesson } = getTodayLesson()
    const first  = markLessonApplied(lesson.id)
    const second = markLessonApplied(lesson.id)
    expect(first).toBe(true)
    expect(second).toBe(false)
  })
})
