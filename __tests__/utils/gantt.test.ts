import { describe, it, expect } from 'vitest'
import {
  toDate,
  mondayOf,
  addDays,
  dayDiff,
  calcRange,
  isOverdue,
  flattenVisible,
} from '@/lib/utils/gantt'
import type { Task } from '@/types/task'
import type { TaskNode } from '@/types/task'

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  parentId: null,
  title: '테스트 작업',
  description: null,
  assignee: null,
  status: 'todo',
  progress: 0,
  startDate: null,
  dueDate: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

const makeNode = (task: Task, children: TaskNode[] = []): TaskNode => ({
  ...task,
  children,
})

// ─── toDate ───────────────────────────────────────────────────────────────────

describe('toDate', () => {
  it('TC-U1 YYYY-MM-DD를 로컬 자정 Date로 변환한다', () => {
    const d = toDate('2026-05-01')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(4) // 0-based: 4 = 5월
    expect(d.getDate()).toBe(1)
    expect(d.getHours()).toBe(0)
  })

  it('TC-U2 연말 날짜(12-31)를 정확히 변환한다', () => {
    const d = toDate('2026-12-31')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(11) // 12월
    expect(d.getDate()).toBe(31)
  })
})

// ─── mondayOf ─────────────────────────────────────────────────────────────────

describe('mondayOf', () => {
  it('TC-U3 수요일(2026-04-29) → 월요일(2026-04-27) 반환', () => {
    const wed = new Date(2026, 3, 29) // 2026-04-29 수요일
    const mon = mondayOf(wed)
    expect(mon.getFullYear()).toBe(2026)
    expect(mon.getMonth()).toBe(3)
    expect(mon.getDate()).toBe(27)
  })

  it('TC-U4 월요일 입력이면 그대로 반환', () => {
    const monday = new Date(2026, 3, 27) // 2026-04-27 월요일
    const result = mondayOf(monday)
    expect(result.getDate()).toBe(27)
    expect(result.getDay()).toBe(1)
  })

  it('TC-U5 일요일(2026-04-26) → 6일 전 월요일(2026-04-20) 반환', () => {
    const sun = new Date(2026, 3, 26) // 2026-04-26 일요일
    const mon = mondayOf(sun)
    expect(mon.getDate()).toBe(20)
    expect(mon.getDay()).toBe(1)
  })
})

// ─── addDays ──────────────────────────────────────────────────────────────────

describe('addDays', () => {
  it('TC-U6 +7이면 7일 후를 반환한다', () => {
    const base = new Date(2026, 4, 1)
    const result = addDays(base, 7)
    expect(result.getDate()).toBe(8)
    expect(result.getMonth()).toBe(4)
  })

  it('TC-U7 -1이면 하루 전을 반환한다', () => {
    const base = new Date(2026, 4, 1)
    const result = addDays(base, -1)
    expect(result.getDate()).toBe(30)
    expect(result.getMonth()).toBe(3) // 4월
  })
})

// ─── dayDiff ──────────────────────────────────────────────────────────────────

describe('dayDiff', () => {
  it('TC-U8 같은 날이면 0을 반환한다', () => {
    const d = new Date(2026, 4, 1)
    expect(dayDiff(d, d)).toBe(0)
  })

  it('TC-U9 1주일 차이면 7을 반환한다', () => {
    const a = new Date(2026, 4, 1)
    const b = new Date(2026, 4, 8)
    expect(dayDiff(a, b)).toBe(7)
  })
})

// ─── calcRange ────────────────────────────────────────────────────────────────

describe('calcRange', () => {
  it('TC-U10 날짜 없는 작업만 있으면 start는 월요일이고 totalDays ≥ 56', () => {
    const tasks = [makeTask()]
    const { start, totalDays } = calcRange(tasks)
    expect(start.getDay()).toBe(1) // 월요일
    expect(totalDays).toBeGreaterThanOrEqual(56)
  })

  it('TC-U11 날짜 있는 작업이면 ±7일 패딩 포함 범위를 반환한다', () => {
    const tasks = [
      makeTask({ startDate: '2026-05-01', dueDate: '2026-05-10' }),
      makeTask({ id: 'task-2', startDate: '2026-05-15', dueDate: '2026-05-20' }),
    ]
    const { start } = calcRange(tasks)
    // start는 2026-04-24(=2026-05-01 -7일)의 주 월요일 이하
    const earliest = toDate('2026-05-01')
    const paddedStart = addDays(earliest, -7)
    expect(start.getTime()).toBeLessThanOrEqual(paddedStart.getTime())
  })

  it('TC-U12 짧은 날짜 범위여도 totalDays ≥ 56(최소 8주)을 보장한다', () => {
    const tasks = [makeTask({ startDate: '2026-05-01', dueDate: '2026-05-03' })]
    const { totalDays } = calcRange(tasks)
    expect(totalDays).toBeGreaterThanOrEqual(56)
  })
})

// ─── isOverdue ────────────────────────────────────────────────────────────────

describe('isOverdue', () => {
  it('TC-U13 dueDate가 null이면 false', () => {
    expect(isOverdue(makeTask({ dueDate: null }))).toBe(false)
  })

  it('TC-U14 status가 done이면 기한이 지나도 false', () => {
    expect(isOverdue(makeTask({ dueDate: '2020-01-01', status: 'done' }))).toBe(false)
  })

  it('TC-U15 기한이 과거이고 status가 doing이면 true', () => {
    expect(isOverdue(makeTask({ dueDate: '2020-01-01', status: 'doing' }))).toBe(true)
  })

  it('TC-U16 기한이 오늘이면 false (아직 지나지 않음)', () => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mm}-${dd}`
    expect(isOverdue(makeTask({ dueDate: todayStr, status: 'doing' }))).toBe(false)
  })
})

// ─── flattenVisible ───────────────────────────────────────────────────────────

describe('flattenVisible', () => {
  it('TC-U17 collapsed에 포함된 노드의 자식은 결과에 포함되지 않는다', () => {
    const child = makeNode(makeTask({ id: 'child-1', title: '자식' }))
    const parent = makeNode(makeTask({ id: 'parent-1', title: '부모' }), [child])
    const collapsed = new Set(['parent-1'])
    const rows = flattenVisible([parent], collapsed)
    expect(rows).toHaveLength(1)
    expect(rows[0].node.id).toBe('parent-1')
  })

  it('TC-U18 모두 펼침 상태면 전체 행이 올바른 depth로 포함된다', () => {
    const child = makeNode(makeTask({ id: 'child-1', title: '자식' }))
    const parent = makeNode(makeTask({ id: 'parent-1', title: '부모' }), [child])
    const rows = flattenVisible([parent], new Set())
    expect(rows).toHaveLength(2)
    expect(rows[0].depth).toBe(0)
    expect(rows[1].depth).toBe(1)
  })
})
