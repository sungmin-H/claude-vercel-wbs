'use client'

import { useState } from 'react'
import { Box, Flex, Text, Portal } from '@chakra-ui/react'
import type { PreviewRow } from '@/lib/utils/csv'

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
  const updateCount = rows.filter(r => r.ok === 'update').length
  const addCount = toAdd.length - updateCount

  const btnLabel = addCount > 0 && updateCount > 0
    ? `추가 ${addCount} · 수정 ${updateCount}`
    : updateCount > 0
      ? `${updateCount}개 수정`
      : `${addCount}개 추가`

  const handleConfirm = async () => {
    setImporting(true)
    const idMap = new Map<string, string>()     // csv id → db id (update 행)
    const titleToId = new Map<string, string>() // 제목 → db id (add 행, 배치 내 부모 해결)

    for (const row of toAdd) {
      // 부모 해결: 이미 resolve됐으면 그대로, 아니면 배치 내에서 재시도
      let resolvedParentId: string | null = row.parentId
      if (!resolvedParentId) {
        if (row.parentCsvId) {
          resolvedParentId = idMap.get(row.parentCsvId) ?? null
        } else if (row.parentTitle) {
          resolvedParentId = titleToId.get(row.parentTitle) ?? null
        }
      }

      const body = {
        title: row.title,
        assignee: row.assignee || null,
        status: row.status || 'todo',
        progress: row.progress || 0,
        startDate: row.startDate,
        dueDate: row.dueDate,
        parentId: resolvedParentId,
      }

      if (row.ok === 'update' && row.id) {
        await fetch(`/api/tasks/${row.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        idMap.set(row.id, row.id)
        titleToId.set(row.title, row.id)
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const created = await res.json()
        if (created?.id) titleToId.set(row.title, created.id)
      }
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
              {addCount > 0 && <Pill bg="var(--c-accent-soft)" fg="var(--c-accent)" label={`${addCount}개 작업 추가`} />}
              {updateCount > 0 && <Pill bg="#EDE9FE" fg="#7C3AED" label={`수정 ${updateCount}건`} />}
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
                  const tone = r.ok === 'skip' ? '#FEF2F2' : r.ok === 'warn' ? '#FFFBEB' : r.ok === 'update' ? '#F5F3FF' : 'white'
                  const dim = r.ok === 'skip'
                  return (
                    <tr key={i} style={{ background: tone }}>
                      <td style={tdStyle}><span style={{ color: '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span></td>
                      <td style={tdStyle}>
                        {r.ok === 'add' && <Pill mini bg="var(--c-accent-soft)" fg="var(--c-accent)" label="추가" />}
                        {r.ok === 'update' && <Pill mini bg="#EDE9FE" fg="#7C3AED" label="수정" />}
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
              ℹ️ 제목이 같은 작업은 <b>수정</b>, 새 제목은 <b>추가</b>합니다.
            </Text>
            <Flex gap={2}>
              <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white', color: '#334155', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>취소</button>
              <button onClick={handleConfirm} disabled={importing || toAdd.length === 0} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--c-accent)', background: 'var(--c-accent)', color: 'white', fontSize: '13px', fontWeight: 500, cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.7 : 1 }}>
                {importing ? '처리 중…' : btnLabel}
              </button>
            </Flex>
          </Flex>
        </Box>
      </Box>
    </Portal>
  )
}

export { parseCsvPreview } from '@/lib/utils/csv'
