'use client'

import { useState } from 'react'
import { Box, Flex, Text, Portal } from '@chakra-ui/react'
import type { Task } from '@/types/task'
import type { DeliverableType } from '@/types/task'
import { AddDeliverableForm, StagedDeliverableItem } from '@/components/deliverables-ui'

interface Props {
  open: boolean
  parentId?: string | null
  allTasks: Task[]
  onClose: () => void
  onCreated: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: '13px',
  border: '1px solid #E2E8F0', borderRadius: '8px', background: 'white',
  color: '#0F172A', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

const STATUSES = [
  { value: 'todo', label: '할 일' },
  { value: 'doing', label: '진행 중' },
  { value: 'done', label: '완료' },
] as const

function FieldLabel({ label, en, required }: { label: string; en: string; required?: boolean }) {
  return (
    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>
      {label}
      {required && <span style={{ color: '#DC2626', marginLeft: '2px' }}>*</span>}
      <span style={{ color: '#94A3B8', fontWeight: 400 }}> · {en}</span>
    </label>
  )
}

export function TaskCreateModal({ open, parentId, allTasks, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState('')
  const [status, setStatus] = useState<'todo' | 'doing' | 'done'>('todo')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [titleError, setTitleError] = useState(false)
  const [dateError, setDateError] = useState('')
  const [delivs, setDelivs] = useState<{ name: string; type: DeliverableType }[]>([])

  const parentTask = parentId ? allTasks.find(t => t.id === parentId) : null

  const reset = () => {
    setTitle(''); setDescription(''); setAssignee('')
    setStatus('todo'); setStartDate(''); setDueDate('')
    setTitleError(false); setDateError(''); setDelivs([])
  }

  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    if (!title.trim()) { setTitleError(true); return }
    if (startDate && dueDate && dueDate < startDate) {
      setDateError('목표 기한은 시작일 이후여야 합니다')
      return
    }
    setTitleError(false); setDateError('')

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description || null,
        assignee: assignee || null,
        status,
        progress: 0,
        startDate: startDate || null,
        dueDate: dueDate || null,
        parentId: parentId || null,
      }),
    })
    if (res.ok && delivs.length > 0) {
      const task = await res.json()
      await Promise.all(delivs.map(d =>
        fetch(`/api/tasks/${task.id}/deliverables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: d.name, type: d.type }),
        })
      ))
    }
    reset()
    onCreated()
  }

  if (!open) return null

  return (
    <Portal>
      <Box
        position="fixed" inset={0} zIndex={100}
        style={{ background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        onClick={handleClose}
      >
        <Box
          style={{ width: '600px', maxHeight: '95vh', overflow: 'auto', background: 'white', borderRadius: '14px', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <Flex px="24px" pt="20px" pb="16px" borderBottom="1px solid #EEF2F6" alignItems="flex-start" justifyContent="space-between">
            <Box>
              <Text style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                작업 추가 · New Task
              </Text>
              <Text style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', marginTop: '4px', letterSpacing: '-0.2px' }}>
                새로운 작업을 만듭니다
              </Text>
              {parentTask && (
                <Text style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  상위 작업: <b style={{ color: '#0F172A' }}>{parentTask.title}</b>
                </Text>
              )}
            </Box>
            <button onClick={handleClose} style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: '#F1F5F9', color: '#64748B', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </Flex>

          {/* Body */}
          <Box px="24px" py="20px" display="flex" flexDirection="column" gap="16px">
            {/* Title */}
            <div>
              <FieldLabel label="제목" en="Title" required />
              <input
                aria-label="제목"
                style={{ ...inputStyle, borderColor: titleError ? '#DC2626' : '#E2E8F0' }}
                placeholder="예: 사용자 인터뷰 진행"
                value={title}
                onChange={e => { setTitle(e.target.value); setTitleError(false) }}
                autoFocus
              />
              {titleError && <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px' }}>⚠ 제목은 필수 항목입니다</div>}
            </div>

            {/* Description */}
            <div>
              <FieldLabel label="설명" en="Description" />
              <textarea
                style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                placeholder="작업의 배경이나 완료 기준을 적어주세요"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* Assignee + Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <FieldLabel label="담당자" en="Assignee" />
                <input aria-label="담당자" style={inputStyle} placeholder="이름 또는 핸들" value={assignee} onChange={e => setAssignee(e.target.value)} />
              </div>
              <div>
                <FieldLabel label="상태" en="Status" />
                <Flex gap={1}>
                  {STATUSES.map(s => (
                    <button key={s.value} onClick={() => setStatus(s.value)} style={{
                      flex: 1, padding: '9px 6px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
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

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <FieldLabel label="시작일" en="Start" />
                <input aria-label="시작일" type="date" style={inputStyle} value={startDate} onChange={e => { setStartDate(e.target.value); setDateError('') }} />
              </div>
              <div>
                <FieldLabel label="목표 기한" en="Due" />
                <input
                  aria-label="목표 기한"
                  type="date"
                  style={{ ...inputStyle, borderColor: dateError ? '#DC2626' : '#E2E8F0' }}
                  value={dueDate}
                  onChange={e => { setDueDate(e.target.value); setDateError('') }}
                />
                {dateError && <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px' }}>⚠ {dateError}</div>}
              </div>
            </div>

            {/* Deliverables */}
            <div>
              <FieldLabel label="산출물" en="Deliverables" />
              <Box display="flex" flexDirection="column" gap="6px">
                <AddDeliverableForm onAdd={(name, type) => setDelivs(prev => [...prev, { name, type }])} />
                {delivs.map((d, i) => (
                  <StagedDeliverableItem
                    key={i}
                    name={d.name}
                    type={d.type}
                    onRemove={() => setDelivs(prev => prev.filter((_, j) => j !== i))}
                  />
                ))}
              </Box>
            </div>
          </Box>

          {/* Footer */}
          <Flex px="24px" py="14px" borderTop="1px solid #EEF2F6" justifyContent="space-between" alignItems="center" bg="#FAFBFC" style={{ borderRadius: '0 0 14px 14px' }}>
            <Text style={{ fontSize: '11px', color: '#94A3B8' }}>
              <kbd style={{ padding: '2px 6px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '4px', fontSize: '10px' }}>Esc</kbd> 취소
            </Text>
            <Flex gap={2}>
              <button onClick={handleClose} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white', color: '#334155', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--c-accent)', background: 'var(--c-accent)', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>작업 만들기</button>
            </Flex>
          </Flex>
        </Box>
      </Box>
    </Portal>
  )
}
