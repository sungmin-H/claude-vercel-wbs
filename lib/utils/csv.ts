import type { Task } from '@/types/task'

export interface PreviewRow {
  ok: 'add' | 'update' | 'warn' | 'skip'
  id?: string
  title: string
  assignee: string
  status: string
  progress: number
  startDate: string | null
  dueDate: string | null
  parentId: string | null
  parentTitle?: string   // 배치 내 제목 기반 부모 해결용
  parentCsvId?: string  // 배치 내 ID 기반 부모 해결용
  reason?: string
  warnMsg?: string
}

export function parseCSVLine(line: string): string[] {
  if (line.charCodeAt(0) === 0xFEFF) line = line.slice(1)
  const result: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      result.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}

export function parseDate(s: string | undefined): string | null {
  if (!s) return null
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return s.slice(0, 10)
}

export function parseCsvPreview(text: string, existingTasks: Task[]): PreviewRow[] {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)

  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const dataLines = lines.slice(1)

  return dataLines.map((line, i) => {
    const fields = parseCSVLine(line)
    const title = fields[0]?.trim() ?? ''

    if (!title) {
      return { ok: 'skip', title: '', assignee: '', status: 'todo', progress: 0, startDate: null, dueDate: null, parentId: null, reason: `제목 누락 (line ${i + 2})` }
    }

    const assignee = fields[2]?.trim() ?? ''
    const statusRaw = fields[3]?.trim() ?? ''
    const status = ['todo', 'doing', 'done'].includes(statusRaw) ? statusRaw : 'todo'
    const progressRaw = parseInt(fields[4] ?? '0')
    const progress = isNaN(progressRaw) ? 0 : Math.max(0, Math.min(100, progressRaw))
    const startDate = parseDate(fields[5]?.trim())
    const dueDate = parseDate(fields[6]?.trim())

    const parentTitleField = fields[7]?.trim() ?? ''
    const parentIdField = fields[8]?.trim() ?? ''  // 상위 id
    const ownIdField = fields[9]?.trim() ?? ''      // id

    // 부모 해결: 상위 id 우선, 없으면 상위 작업 제목 폴백
    let parentId: string | null = null
    let parentTitle: string | undefined
    let parentCsvId: string | undefined
    let hasWarn = false

    if (parentIdField) {
      const parent = existingTasks.find(t => t.id === parentIdField)
      if (parent) {
        parentId = parent.id
      } else if (parentTitleField) {
        // ID 매칭 실패 → 제목 폴백
        const parentByTitle = existingTasks.find(t => t.title === parentTitleField)
        if (parentByTitle) {
          parentId = parentByTitle.id
        } else {
          // 기존 작업에도 없음 → 배치 내 해결 시도 (ID 우선, 제목 폴백)
          parentCsvId = parentIdField
          parentTitle = parentTitleField
          hasWarn = true
        }
      } else {
        parentCsvId = parentIdField  // 배치 내 해결 시도용
        hasWarn = true
      }
    } else if (parentTitleField) {
      const parent = existingTasks.find(t => t.title === parentTitleField)
      if (parent) {
        parentId = parent.id
      } else {
        parentTitle = parentTitleField  // 배치 내 해결 시도용
        hasWarn = true
      }
    }

    // 자기 자신 매칭: id 기반
    const existing = ownIdField ? existingTasks.find(t => t.id === ownIdField) : null

    return {
      ok: existing ? 'update' : hasWarn ? 'warn' : 'add',
      id: existing?.id,
      title, assignee, status, progress, startDate, dueDate,
      parentId,
      parentTitle,
      parentCsvId,
      warnMsg: hasWarn ? '상위 매칭 실패 → 최상위로 처리' : undefined,
    } satisfies PreviewRow
  })
}

export function generateCsvContent(tasks: Task[]): string {
  const header = ['제목', '설명', '담당자', '상태', '진행률', '시작일', '목표 기한', '상위 작업 제목', '상위 id', 'id']
  const rows = tasks.map(t => [
    t.title,
    t.description ?? '',
    t.assignee ?? '',
    t.status,
    String(t.progress),
    t.startDate ?? '',
    t.dueDate ?? '',
    tasks.find(p => p.id === t.parentId)?.title ?? '',  // 상위 작업 제목 (가독성)
    t.parentId ?? '',                                    // 상위 id
    t.id,                                               // id
  ])
  return [header, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}
