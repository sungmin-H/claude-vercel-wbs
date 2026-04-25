'use client'

import { useState } from 'react'
import { Box, Flex, Text, Portal } from '@chakra-ui/react'
import type { Task } from '@/types/task'

interface PreviewRow {
  ok: 'add' | 'warn' | 'skip'
  title: string
  assignee: string
  status: string
  progress: number
  startDate: string | null
  dueDate: string | null
  parentId: string | null
  reason?: string
  warnMsg?: string
}

interface CsvPreviewData {
  filename: string
  rows: PreviewRow[]
}

interface Props {
  open: boolean
  previewData: CsvPreviewData | null
  onClose: () => void
  onImported: () => void
}

function Pill({ bg, fg, label, mini }: { bg: string; fg: string; label: string; mini?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: mini ? '2px 7px' : '4px 10px',
      borderRadius: '6px', background: bg, color: fg,
      fontSize: mini ? '10px' : '11px', fontWeight: 700, letterSpacing: '0.2px', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

export function CsvImportModal({ open, previewData, onClose, onImported }: Props) {
  const [importing, setImporting] = useState(false)

  if (!open || !previewData) return null

  const { filename, rows } = previewData
  const toAdd = rows.filter(r => r.ok !== 'skip')
  const skipCount = rows.filter(r => r.ok === 'skip').length
  const warnCount = rows.filter(r => r.ok === 'warn').length

  const handleConfirm = async () => {
    setImporting(true)
    for (const row of toAdd) {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: row.title,
          assignee: row.assignee || null,
          status: row.status || 'todo',
          progress: row.progress || 0,
          startDate: row.startDate,
          dueDate: row.dueDate,
          parentId: row.parentId,
        }),
      })
    }
    setImporting(false)
    onImported()
  }

  const tdStyle: React.CSSProperties = { padding: '10px 8px', borderBottom: '1px solid #F1F5F9', verticalAlign: 'top' }

  return (
    <Portal>
      <Box
        position="fixed" inset={0} zIndex={100}
        style={{ background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        onClick={onClose}
      >
        <Box
          style={{ width: '720px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '14px', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <Box px="24px" pt="20px" pb="16px" borderBottom="1px solid #EEF2F6">
            <Text style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              CSV 미리보기 · Import preview
            </Text>
            <Text style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
              {filename}
            </Text>
            <Flex gap={2.5} mt={3.5}>
              <Pill bg="var(--c-accent-soft)" fg="var(--c-accent)" label={`${toAdd.length}개 작업 추가`} />
              {warnCount > 0 && <Pill bg="#FEF3C7" fg="#B45309" label={`경고 ${warnCount}건`} />}
              {skipCount > 0 && <Pill bg="#FEE2E2" fg="#B91C1C" label={`제외 ${skipCount}건`} />}
            </Flex>
          </Box>

          {/* Table */}
          <Box px="24px" overflow="auto" style={{ maxHeight: '420px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: 'white' }}>
                  {['#', '상태', '제목', '담당자', '시작일', '기한', '상위'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #EEF2F6', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const tone = r.ok === 'skip' ? '#FEF2F2' : r.ok === 'warn' ? '#FFFBEB' : 'white'
                  const dim = r.ok === 'skip'
                  return (
                    <tr key={i} style={{ background: tone }}>
                      <td style={tdStyle}><span style={{ color: '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span></td>
                      <td style={tdStyle}>
                        {r.ok === 'add' && <Pill mini bg="var(--c-accent-soft)" fg="var(--c-accent)" label="추가" />}
                        {r.ok === 'warn' && <Pill mini bg="#FEF3C7" fg="#B45309" label="경고" />}
                        {r.ok === 'skip' && <Pill mini bg="#FEE2E2" fg="#B91C1C" label="제외" />}
                      </td>
                      <td style={{ ...tdStyle, color: dim ? '#CBD5E1' : '#0F172A', fontWeight: 500 }}>
                        {r.title || <span style={{ fontStyle: 'italic' }}>(empty)</span>}
                        {r.reason && <div style={{ fontSize: '10px', color: '#B91C1C', marginTop: '2px' }}>↳ {r.reason}</div>}
                        {r.warnMsg && <div style={{ fontSize: '10px', color: '#B45309', marginTop: '2px' }}>↳ {r.warnMsg}</div>}
                      </td>
                      <td style={{ ...tdStyle, color: dim ? '#CBD5E1' : '#475569' }}>{r.assignee || '—'}</td>
                      <td style={{ ...tdStyle, color: dim ? '#CBD5E1' : '#475569', fontVariantNumeric: 'tabular-nums' }}>{r.startDate || '—'}</td>
                      <td style={{ ...tdStyle, color: dim ? '#CBD5E1' : '#475569', fontVariantNumeric: 'tabular-nums' }}>{r.dueDate || '—'}</td>
                      <td style={{ ...tdStyle, color: dim ? '#CBD5E1' : '#64748B' }}>—</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Box>

          {/* Footer */}
          <Flex px="24px" py="16px" borderTop="1px solid #EEF2F6" justifyContent="space-between" alignItems="center">
            <Text style={{ fontSize: '11px', color: '#64748B' }}>
              ℹ️ 이 작업은 <b>추가만</b> 수행하며, 기존 항목을 수정하지 않습니다.
            </Text>
            <Flex gap={2}>
              <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white', color: '#334155', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>취소</button>
              <button onClick={handleConfirm} disabled={importing || toAdd.length === 0} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--c-accent)', background: 'var(--c-accent)', color: 'white', fontSize: '13px', fontWeight: 500, cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.7 : 1 }}>
                {importing ? '가져오는 중…' : `${toAdd.length}개 추가`}
              </button>
            </Flex>
          </Flex>
        </Box>
      </Box>
    </Portal>
  )
}

// CSV parsing utility
export function parseCsvPreview(text: string, existingTasks: Task[]): PreviewRow[] {
  if (text.startsWith('﻿')) text = text.slice(1)

  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  // Skip header row
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
    const parentTitle = fields[7]?.trim() ?? ''

    const parent = parentTitle ? existingTasks.find(t => t.title === parentTitle) : null
    const hasWarn = !!parentTitle && !parent

    return {
      ok: hasWarn ? 'warn' : 'add',
      title, assignee, status, progress, startDate, dueDate,
      parentId: parent?.id ?? null,
      warnMsg: hasWarn ? '상위 매칭 실패 → 최상위로 처리' : undefined,
    } satisfies PreviewRow
  })
}

function parseCSVLine(line: string): string[] {
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

function parseDate(s: string | undefined): string | null {
  if (!s) return null
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return s.slice(0, 10)
}
