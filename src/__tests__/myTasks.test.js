import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/firebase', () => ({ db: {} }))

import { visibleTasks, cleanTaskText, subscribeTasks, addTask, setTaskDone, deleteTask } from '../services/myTasksService'
import { getLocalDateKey } from '../utils/localDate'

describe('getLocalDateKey', () => {
  it('uses the local calendar date, not UTC', () => {
    // 00:30 local on Jan 5 — UTC may still be Jan 4 in UTC+ timezones
    expect(getLocalDateKey(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05')
    expect(getLocalDateKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })
})

describe('visibleTasks', () => {
  const today = '2026-09-24'
  const tasks = [
    { id: 'a', text: 'open today',      done: false, createdDate: today,        doneDate: null },
    { id: 'b', text: 'open from before', done: false, createdDate: '2026-09-22', doneDate: null },
    { id: 'c', text: 'done today',      done: true,  createdDate: '2026-09-23', doneDate: today },
    { id: 'd', text: 'done yesterday',  done: true,  createdDate: '2026-09-23', doneDate: '2026-09-23' },
  ]

  it('shows open tasks and tasks done today, hides tasks done on earlier days', () => {
    expect(visibleTasks(tasks, today).map(t => t.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('marks only open tasks from earlier days as carried over', () => {
    const byId = Object.fromEntries(visibleTasks(tasks, today).map(t => [t.id, t.carriedOver]))
    expect(byId).toEqual({ a: false, b: true, c: false })
  })

  it('lists older tasks first', () => {
    expect(visibleTasks(tasks, today)[0].id).toBe('b')
  })
})

describe('cleanTaskText', () => {
  it('trims, collapses whitespace and caps length', () => {
    expect(cleanTaskText('  לקנות   חלב \n ')).toBe('לקנות חלב')
    expect(cleanTaskText('x'.repeat(300))).toHaveLength(200)
    expect(cleanTaskText('   ')).toBe('')
  })
})

describe('guest mode (localStorage)', () => {
  beforeEach(() => localStorage.clear())

  it('adds, completes and deletes, notifying subscribers', async () => {
    const seen = []
    const unsub = subscribeTasks(null, list => seen.push(list))
    const id = await addTask(null, 'לשלוח מייל')
    expect(seen.at(-1)).toMatchObject([{ id, text: 'לשלוח מייל', done: false, carriedOver: false }])

    await setTaskDone(null, id, true)
    expect(seen.at(-1)[0]).toMatchObject({ done: true, doneDate: getLocalDateKey() })

    await deleteTask(null, id)
    expect(seen.at(-1)).toEqual([])
    unsub()
  })

  it('ignores empty input', async () => {
    expect(await addTask(null, '   ')).toBeNull()
  })
})
