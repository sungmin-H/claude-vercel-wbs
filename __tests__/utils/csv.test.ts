import { describe, it, expect } from 'vitest'
import { parseCSVLine, parseDate, parseCsvPreview, generateCsvContent } from '@/lib/utils/csv'
import type { Task } from '@/types/task'

const makeTask = (id: string, title: string, parentId: string | null = null): Task => ({
  id,
  parentId,
  title,
  description: null,
  assignee: null,
  status: 'todo',
  progress: 0,
  startDate: null,
  dueDate: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
})

const HEADER = '제목,설명,담당자,상태,진행률,시작일,목표 기한,상위 작업 제목,상위 id,id'

describe('parseCSVLine', () => {
  it('일반 필드를 파싱한다', () => {
    expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('따옴표 필드 내 쉼표를 유지한다', () => {
    expect(parseCSVLine('"a,b",c')).toEqual(['a,b', 'c'])
  })

  it('따옴표 이스케이프("")를 처리한다', () => {
    expect(parseCSVLine('"a""b",c')).toEqual(['a"b', 'c'])
  })

  it('BOM 포함 줄을 처리한다', () => {
    expect(parseCSVLine('﻿제목,설명')).toEqual(['제목', '설명'])
  })

  it('빈 필드를 빈 문자열로 반환한다', () => {
    expect(parseCSVLine('a,,c')).toEqual(['a', '', 'c'])
  })
})

describe('parseDate', () => {
  it('유효한 ISO 날짜를 반환한다', () => {
    expect(parseDate('2026-01-15')).toBe('2026-01-15')
  })

  it('시간이 포함된 ISO 날짜에서 날짜 부분만 반환한다', () => {
    expect(parseDate('2026-01-15T00:00:00')).toBe('2026-01-15')
  })

  it('빈 문자열이면 null을 반환한다', () => {
    expect(parseDate('')).toBeNull()
  })

  it('undefined이면 null을 반환한다', () => {
    expect(parseDate(undefined)).toBeNull()
  })

  it('잘못된 형식이면 null을 반환한다', () => {
    expect(parseDate('15/01/2026')).toBeNull()
  })
})

describe('parseCsvPreview', () => {
  it('정상 행은 ok: add로 반환한다', () => {
    const csv = `${HEADER}\n기획,,김PM,todo,0,,,`
    const [row] = parseCsvPreview(csv, [])
    expect(row.ok).toBe('add')
    expect(row.title).toBe('기획')
  })

  it('제목이 없는 행은 ok: skip으로 반환한다', () => {
    const csv = `${HEADER}\n,설명만,,,,,,`
    const [row] = parseCsvPreview(csv, [])
    expect(row.ok).toBe('skip')
    expect(row.reason).toContain('제목 누락')
  })

  it('잘못된 status는 todo로 기본값 설정한다', () => {
    const csv = `${HEADER}\n기획,,김PM,invalid,0,,,`
    const [row] = parseCsvPreview(csv, [])
    expect(row.status).toBe('todo')
  })

  it('유효한 status 값은 그대로 반환한다', () => {
    for (const s of ['todo', 'doing', 'done']) {
      const csv = `${HEADER}\n기획,,김PM,${s},0,,,`
      const [row] = parseCsvPreview(csv, [])
      expect(row.status).toBe(s)
    }
  })

  it('progress > 100은 100으로 클램프한다', () => {
    const csv = `${HEADER}\n기획,,김PM,todo,150,,,`
    const [row] = parseCsvPreview(csv, [])
    expect(row.progress).toBe(100)
  })

  it('progress < 0은 0으로 클램프한다', () => {
    const csv = `${HEADER}\n기획,,김PM,todo,-10,,,`
    const [row] = parseCsvPreview(csv, [])
    expect(row.progress).toBe(0)
  })

  it('존재하지 않는 상위 제목이면 ok: warn이고 parentTitle이 설정된다', () => {
    const csv = `${HEADER}\n하위작업,,김PM,todo,0,,,없는부모`
    const [row] = parseCsvPreview(csv, [])
    expect(row.ok).toBe('warn')
    expect(row.parentId).toBeNull()
    expect(row.parentTitle).toBe('없는부모')
    expect(row.warnMsg).toContain('상위 매칭 실패')
  })

  it('상위 작업 제목으로 기존 부모를 찾으면 ok: add이고 parentId가 설정된다', () => {
    const parent = makeTask('parent-id', '부모작업')
    const csv = `${HEADER}\n하위작업,,김PM,todo,0,,,부모작업,,`
    const [row] = parseCsvPreview(csv, [parent])
    expect(row.ok).toBe('add')
    expect(row.parentId).toBe('parent-id')
  })

  it('상위 id로 기존 부모를 찾으면 ok: add이고 parentId가 설정된다', () => {
    const parent = makeTask('parent-id', '부모작업')
    const csv = `${HEADER}\n하위작업,,김PM,todo,0,,,, parent-id,`
    const [row] = parseCsvPreview(csv, [parent])
    expect(row.ok).toBe('add')
    expect(row.parentId).toBe('parent-id')
  })

  it('상위 id 매칭 실패 시 상위 작업 제목으로 폴백한다', () => {
    const parent = makeTask('parent-id', '부모작업')
    const csv = `${HEADER}\n하위작업,,김PM,todo,0,,,부모작업,wrong-id,`
    const [row] = parseCsvPreview(csv, [parent])
    expect(row.ok).toBe('add')
    expect(row.parentId).toBe('parent-id')
  })

  it('id 컬럼이 기존 task와 일치하면 ok: update이고 id가 설정된다', () => {
    const existing = makeTask('existing-id', '기획')
    const csv = `${HEADER}\n기획,,박PM,doing,50,,,,, existing-id`
    const [row] = parseCsvPreview(csv, [existing])
    expect(row.ok).toBe('update')
    expect(row.id).toBe('existing-id')
  })

  it('id 기반 upsert + 부모 없음이면 ok: update이고 warnMsg가 설정된다', () => {
    const existing = makeTask('existing-id', '기획')
    const csv = `${HEADER}\n기획,,박PM,doing,50,,,없는부모,, existing-id`
    const [row] = parseCsvPreview(csv, [existing])
    expect(row.ok).toBe('update')
    expect(row.id).toBe('existing-id')
    expect(row.warnMsg).toContain('상위 매칭 실패')
  })

  it('BOM이 포함된 CSV를 처리한다', () => {
    const csv = `﻿${HEADER}\n기획,,김PM,todo,0,,,`
    const [row] = parseCsvPreview(csv, [])
    expect(row.title).toBe('기획')
  })

  it('헤더만 있으면 빈 배열을 반환한다', () => {
    expect(parseCsvPreview(HEADER, [])).toEqual([])
  })
})

describe('generateCsvContent', () => {
  it('헤더 행이 10개 컬럼을 포함한다', () => {
    const csv = generateCsvContent([])
    const header = csv.split('\n')[0]
    const cols = parseCSVLine(header)
    expect(cols).toHaveLength(10)
    expect(cols[0]).toBe('제목')
    expect(cols[7]).toBe('상위 작업 제목')
    expect(cols[8]).toBe('상위 id')
    expect(cols[9]).toBe('id')
  })

  it('필드 값이 따옴표로 감싸진다', () => {
    const task = makeTask('1', '기획')
    const csv = generateCsvContent([task])
    const row = csv.split('\n')[1]
    expect(row.startsWith('"기획"')).toBe(true)
  })

  it('제목 내 따옴표를 이스케이프한다', () => {
    const task = makeTask('1', '기획 "초안"')
    const csv = generateCsvContent([task])
    expect(csv).toContain('"기획 ""초안"""')
  })

  it('parentId가 있는 task의 상위 작업 제목과 상위 id를 출력한다', () => {
    const parent = makeTask('p1', '부모작업')
    const child = { ...makeTask('c1', '자식작업', 'p1') }
    const csv = generateCsvContent([parent, child])
    const childRow = csv.split('\n')[2]
    const cols = parseCSVLine(childRow)
    expect(cols[7]).toBe('부모작업')  // 상위 작업 제목
    expect(cols[8]).toBe('p1')        // 상위 id
    expect(cols[9]).toBe('c1')        // id
  })

  it('null 필드는 빈 문자열로 출력한다', () => {
    const task = makeTask('1', '기획')
    const csv = generateCsvContent([task])
    const row = csv.split('\n')[1]
    const cols = parseCSVLine(row)
    expect(cols[1]).toBe('')  // description
    expect(cols[2]).toBe('')  // assignee
  })

  it('task가 없으면 헤더 행만 반환한다', () => {
    const csv = generateCsvContent([])
    expect(csv.split('\n')).toHaveLength(1)
  })
})
