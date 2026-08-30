import { describe, it, expect } from 'vitest'

// Data modules that contain user-facing Hebrew copy
import { SURPRISE_CATEGORIES, getAllMissions, REPEATABLE_MISSIONS } from '../data/surpriseMissions'
import { QUEST_POOL, DAILY_CHALLENGES } from '../data/dailyQuests'
import { HOBBY_DAYS } from '../data/hobbyDiscovery'
import { CHALLENGE_WEEKS } from '../data/challenges'
import { MT_LEVELS } from '../data/muayThaiPath'
import { BOXING_LEVELS } from '../data/boxingPath'
import { WEEKLY_FOCUS } from '../data/weeklyFocus'

// ── Specific regression tests ────────────────────────────────────────
// Each test guards against a specific term that should NEVER appear in Hebrew UI copy.

describe('localization regressions — forbidden English terms', () => {
  const allMissionTexts = getAllMissions().map(m => m.text)
  const allRepeatableTitles = Object.values(REPEATABLE_MISSIONS).map(m => m.suggestedHabitTitleHe)
  const allQuestTitles = [...QUEST_POOL, ...DAILY_CHALLENGES].map(q => q.title)
  const _allHobbyTasks = HOBBY_DAYS.map(d => d.taskHe)
  const allChallengeTasks = Object.values(CHALLENGE_WEEKS).flat()
  const allMTTitles = MT_LEVELS.flatMap(l => [l.titleHe, ...l.workouts.map(w => w.titleHe)]).filter(Boolean)
  const allBoxingTitles = BOXING_LEVELS.flatMap(l => [l.titleHe, ...l.workouts.map(w => w.titleHe)]).filter(Boolean)
  const allCategoryLabels = SURPRISE_CATEGORIES.map(c => c.label)
  const allWeeklyLabels = WEEKLY_FOCUS.flatMap(f => [f.label, f.desc])

  it('no "visualization" in mission texts', () => {
    const found = allMissionTexts.filter(t => /visualization/i.test(t))
    expect(found).toHaveLength(0)
  })

  it('no "review" in mission texts or repeatable titles', () => {
    const found = [...allMissionTexts, ...allRepeatableTitles].filter(t => /\breview\b/i.test(t))
    expect(found).toHaveLength(0)
  })

  it('no "opt-in" in any data texts', () => {
    const all = [...allMissionTexts, ...allQuestTitles, ...allChallengeTasks]
    const found = all.filter(t => /opt-in/i.test(t))
    expect(found).toHaveLength(0)
  })

  it('no "Non-Negotiable" in any data texts', () => {
    const all = [...allMissionTexts, ...allQuestTitles, ...allChallengeTasks]
    const found = all.filter(t => /non-negotiable/i.test(t))
    expect(found).toHaveLength(0)
  })

  it('no "Checks" (boxing term untranslated) in MT or Boxing level titles', () => {
    const found = [...allMTTitles, ...allBoxingTitles].filter(t => /\bChecks\b/.test(t))
    expect(found).toHaveLength(0)
  })

  it('no standalone "(Teep)" in parentheses in MT level titles', () => {
    const found = allMTTitles.filter(t => /\(Teep\)/i.test(t))
    expect(found).toHaveLength(0)
  })

  it('no "3d" or "/30d" time abbreviations in quest titles', () => {
    const found = allQuestTitles.filter(t => /\b\d+d\b|\/\d+d/.test(t))
    expect(found).toHaveLength(0)
  })

  it('no "אחר פעם" grammar error in any data', () => {
    const all = [...allMissionTexts, ...allQuestTitles]
    const found = all.filter(t => /אחר פעם/.test(t))
    expect(found).toHaveLength(0)
  })

  it('no "1 ימים" grammar error in any data', () => {
    const all = [...allMissionTexts, ...allQuestTitles, ...allChallengeTasks]
    const found = all.filter(t => /1 ימים/.test(t))
    expect(found).toHaveLength(0)
  })

  it('mindset category label is חשיבה (not מיינדסט)', () => {
    const mindsetCat = SURPRISE_CATEGORIES.find(c => c.id === 'mindset')
    expect(mindsetCat?.label).not.toBe('מיינדסט')
    expect(mindsetCat?.label).toBe('חשיבה')
  })

  it('MT level 2 title uses Hebrew (no parenthetical English Teep)', () => {
    const l2 = MT_LEVELS.find(l => l.level === 2)
    expect(l2?.titleHe).not.toMatch(/\(Teep\)/i)
    expect(l2?.titleHe).toContain('טיפ')
  })

  it('MT level 6 title uses Hebrew חסימות (not English Checks)', () => {
    const l6 = MT_LEVELS.find(l => l.level === 6)
    expect(l6?.titleHe).not.toMatch(/\bChecks\b/)
    expect(l6?.titleHe).toContain('חסימות')
  })

  it('shadow boxing in missions translated to איגרוף צל', () => {
    const found = allMissionTexts.filter(t => /shadow boxing/i.test(t))
    expect(found).toHaveLength(0)
  })

  it('no "Teep kicks" in quest titles (should be בעיטות טיפ)', () => {
    const found = allQuestTitles.filter(t => /Teep kicks/i.test(t))
    expect(found).toHaveLength(0)
  })

  it('no "Jabs" + "Crosses" in English in quest titles', () => {
    const found = allQuestTitles.filter(t => /\bJabs?\b|\bCrosses?\b/i.test(t))
    expect(found).toHaveLength(0)
  })

  it('no "Combat Protocols" (English) in weekly focus descriptions', () => {
    const found = allWeeklyLabels.filter(t => /Combat Protocols/i.test(t))
    expect(found).toHaveLength(0)
  })

  it('no "Shadow Boxing" (English) in weekly focus descriptions', () => {
    const found = allWeeklyLabels.filter(t => /Shadow Boxing/i.test(t))
    expect(found).toHaveLength(0)
  })

  it('no "code review" (English) in challenge week texts', () => {
    const found = allChallengeTasks.filter(t => /\bcode review\b/i.test(t))
    expect(found).toHaveLength(0)
  })

  it('no "security vulnerabilities" (English) in challenge week texts', () => {
    const found = allChallengeTasks.filter(t => /security vulnerabilities/i.test(t))
    expect(found).toHaveLength(0)
  })

  it('PRIME remains unchanged in category labels', () => {
    const found = allCategoryLabels.filter(l => /prime/i.test(l))
    expect(found).toHaveLength(0) // PRIME should not appear as a category label
  })
})

// ── Pluralization guard ──────────────────────────────────────────────

describe('hebrewPlurals utility', () => {
  it('exports days helper with correct singular form', async () => {
    const { days } = await import('../utils/hebrewPlurals')
    expect(days(1)).toBe('יום אחד')
    expect(days(2)).toBe('2 ימים')
    expect(days(7)).toBe('7 ימים')
  })

  it('exports streakDays with correct singular form', async () => {
    const { streakDays } = await import('../utils/hebrewPlurals')
    expect(streakDays(1)).toBe('יום אחד ברצף')
    expect(streakDays(3)).toBe('3 ימים ברצף')
  })

  it('exports workouts with correct singular form', async () => {
    const { workouts } = await import('../utils/hebrewPlurals')
    expect(workouts(1)).toBe('אימון אחד')
    expect(workouts(6)).toBe('6 אימונים')
  })
})
