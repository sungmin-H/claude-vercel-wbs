'use client'

import { useState } from 'react'
import { Box, Flex, Text, Portal } from '@chakra-ui/react'
import type { Task, Deliverable, DeliverableType, DeliverableStatus } from '@/types/task'
import { AddDeliverableForm, DeliverableListItem, nextDelivStatus } from '@/components/deliverables-ui'

interface Props {
  task: Task
  allTasks: Task[]
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: '13px',
  border: '1px solid #E2E8F0', borderRadius: '8px', background: 'white',
  color: '#0F172A', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

const STATUSES = [
  { value: 'todo', label: '할 일' },
  { value: 'doing', label: '진행 중' },
  { value: 'done', label: '완료' },
] as const

function FieldLabel({ label, en }: { label: string; en: string }) {
  return (
    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>
      {label} <span style={{ color: '#94A3B8', fontWeight: 400 }}>· {en}</span>
    </label>
  )
}

export function TaskEditModal({ task, allTasks, open, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [assignee, setAssignee] = useState(task.assignee ?? '')
  const [status, setStatus] = useState<'todo' | 'doing' | 'done'>(task.status as 'todo' | 'doing' | 'done')
  const [progress, setProgress] = useState(task.progress)
  const [startDate, setStartDate] = useState(task.startDate ?? '')
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [titleError, setTitleError] = useState(false)
  const [dateError, setDateError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [delivs, setDelivs] = useState<Deliverable[]>(task.deliverables ?? [])
  const parentTask = task.parentId ? allTasks.find(t => t.id === task.parentId) : null

  const handleDelivStatusCycle = async (d: Deliverable) => {
    const newStatus = nextDelivStatus(d.status as DeliverableStatus)
    setDelivs(prev => prev.map(x => x.id === d.id ? { ...x, status: newStatus } : x))
    await fetch(`/api/deliverables/${d.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  const handleDelivDelete = async (d: Deliverable) => {
    setDelivs(prev => prev.filter(x => x.id !== d.id))
    await fetch(`/api/deliverables/${d.id}`, { method: 'DELETE' })
  }

  const handleDelivAdd = async (name: string, type: DeliverableType) => {
    const res = await fetch(`/api/tasks/${task.id}/deliverables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type }),
    })
    if (res.ok) {
      const row: Deliverable = await res.json()
      setDelivs(prev => [...prev, row])
    }
  }

  const handleProgressChange = (val: number) => {
    setProgress(val)
    if (val === 100 && status !== 'done') setStatus('done')
  }

  const handleSave = async () => {
    if (!title.trim()) { setTitleError(true); return }
    if (startDate && dueDate && dueDate < startDate) { setDateError(true); return }
    setSaving(true)
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description || null,
        assignee: assignee || null,
        status,
        progress,
        startDate: startDate || null,
        dueDate: dueDate || null,
      }),
    })
    setSaving(false)
    onSaved()
  }

  if (!open) return null

  return (
    <Portal>
      <Box
        position="fixed" inset={0} zIndex={100}
        style={{ background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        onClick={onClose}
      >
        <Box
          style={{ width: '600px', maxHeight: '95vh', overflow: 'auto', background: 'white', borderRadius: '14px', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <Flex px="24px" pt="20px" pb="16px" borderBottom="1px solid #EEF2F6" alignItems="flex-start" justifyContent="space-between">
            <Box>
              <Text style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                작업 편집 · Edit Task
              </Text>
              <Text style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                {task.title}
              </Text>
            </Box>
            <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: '#F1F5F9', color: '#64748B', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </Flex>

          {/* Body */}
          <Box px="24px" py="20px" display="flex" flexDirection="column" gap="14px">
            {/* Title */}
            <div>
              <FieldLabel label="제목" en="Title" />
              <input
                aria-label="제목"
                style={{ ...inputStyle, borderColor: titleError ? '#DC2626' : '#E2E8F0' }}
                value={title}
                onChange={e => { setTitle(e.target.value); setTitleError(false) }}
              />
              {titleError && <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px' }}>⚠ 제목은 필수 항목입니다</div>}
            </div>

            {/* Parent task (read-only) */}
            {parentTask && (
              <div>
                <FieldLabel label="상위 작업" en="Parent Task" />
                <div style={{ ...inputStyle, background: '#F8FAFC', color: '#64748B', cursor: 'default' }}>
                  {parentTask.title}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <FieldLabel label="설명" en="Description" />
              <textarea
                style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                placeholder="작업 설명"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* Assignee + Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <FieldLabel label="담당자" en="Assignee" />
                <input style={inputStyle} value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="이름 또는 핸들" />
              </div>
              <div>
                <FieldLabel label="상태" en="Status" />
                <Flex gap={1}>
                  {STATUSES.map(s => (
                    <button key={s.value} onClick={() => setStatus(s.value)} style={{
                      flex: 1, padding: '8px 4px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                      border: status === s.value ? '1.5px solid var(--c-accent)' : '1px solid #E2E8F0',
                      background: status === s.value ? 'var(--c-accent-soft)' : 'white',
                      color: status === s.value ? 'var(--c-accent)' : '#64748B',
                    }}>
                      {s.label}
                    </button>
                  ))}
                </Flex>
              </div>
            </div>

            {/* Progress */}
            <div>
              <FieldLabel label="진행률" en="Progress" />
              <Flex alignItems="center" gap={3.5}>
                <input
                  type="range" min={0} max={100} value={progress}
                  onChange={e => handleProgressChange(+e.target.value)}
                  style={{ flex: 1, accentColor: 'var(--c-accent)' }}
                />
                <Box
                  style={{ width: '60px', padding: '6px 10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#0F172A', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                >
                  {progress}%
                </Box>
              </Flex>
              {progress === 100 && (
                <Text style={{ fontSize: '11px', color: '#047857', marginTop: '4px' }}>
                  ✓ 진행률 100% → 상태가 자동으로 "완료"로 변경됩니다
                </Text>
              )}
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <FieldLabel label="시작일" en="Start" />
                <input aria-label="시작일" type="date" style={inputStyle} value={startDate} onChange={e => { setStartDate(e.target.value); setDateError(false) }} />
              </div>
              <div>
                <FieldLabel label="목표 기한" en="Due" />
                <input aria-label="목표 기한" type="date" style={inputStyle} value={dueDate} onChange={e => { setDueDate(e.target.value); setDateError(false) }} />
                {dateError && (
                  <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px' }}>
                    ⚠ 목표 기한은 시작일 이후여야 합니다
                  </div>
                )}
              </div>
            </div>

            {/* Deliverables */}
            <div>
              <FieldLabel label="산출물" en="Deliverables" />
              <Box display="flex" flexDirection="column" gap="6px">
                <AddDeliverableForm onAdd={handleDelivAdd} />
                {delivs.map(d => (
                  <DeliverableListItem
                    key={d.id}
                    deliverable={d}
                    onStatusCycle={() => handleDelivStatusCycle(d)}
                    onDelete={() => handleDelivDelete(d)}
                  />
                ))}
                {delivs.length === 0 && (
                  <Text style={{ fontSize: '12px', color: '#94A3B8', padding: '6px 0' }}>
                    산출물이 없습니다. 위에서 추가해 보세요.
                  </Text>
                )}
              </Box>
            </div>
          </Box>

          {/* Footer */}
          <Flex px="24px" py="14px" borderTop="1px solid #EEF2F6" justifyContent="flex-end" alignItems="center" bg="#FAFBFC" gap={2} style={{ borderRadius: '0 0 14px 14px' }}>
            <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white', color: '#334155', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>취소</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--c-accent)', background: 'var(--c-accent)', color: 'white', fontSize: '13px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </Flex>
        </Box>
      </Box>
    </Portal>
  )
}
