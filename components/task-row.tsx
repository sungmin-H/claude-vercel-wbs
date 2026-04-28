'use client'

import { useState, useRef } from 'react'
import { Box, Flex, Text, Portal } from '@chakra-ui/react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '@/types/task'
import { TaskDeleteDialog } from '@/components/task-delete-dialog'
import { DeliverableSummary } from '@/components/deliverables-ui'

const STATUS_MAP = {
  todo:  { label: '할 일',   bg: '#F1F5F9', fg: '#475569' },
  doing: { label: '진행 중', bg: '#DBEAFE', fg: '#1D4ED8' },
  done:  { label: '완료',   bg: '#D1FAE5', fg: '#047857' },
} as const

const STATUS_CYCLE: Record<string, string> = { todo: 'doing', doing: 'done', done: 'todo' }

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(task.dueDate) < today
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  const [, m, day] = d.split('-')
  return `${parseInt(m)}/${parseInt(day)}`
}

interface TaskRowProps {
  task: Task
  depth: number
  hasChildren: boolean
  isExpanded: boolean
  allTasks: Task[]
  onToggle: () => void
  onEdit: () => void
  onAddChild: () => void
  onRefresh: () => void
}

export function TaskRow({
  task, depth, hasChildren, isExpanded, allTasks,
  onToggle, onEdit, onAddChild, onRefresh,
}: TaskRowProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const overdue = isOverdue(task)
  const s = STATUS_MAP[task.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.todo
  const childCount = allTasks.filter(t => t.parentId === task.id).length

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const handleStatusClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const newStatus = STATUS_CYCLE[task.status] || 'todo'
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    onRefresh()
  }

  return (
    <>
      <Box
        ref={setNodeRef}
        display="grid"
        style={{
          gridTemplateColumns: '28px 1fr 150px 100px 170px 120px 175px 36px',
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.5 : 1,
        }}
        px="18px" py="14px"
        alignItems="center"
        borderBottom="1px solid #F1F5F9"
        bg={depth > 0 ? '#FCFCFD' : 'white'}
        cursor="pointer"
        _hover={{ bg: depth > 0 ? '#F8FAFC' : '#FAFBFC' }}
        onClick={onEdit}
      >
        {/* Drag handle */}
        <Box
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          display="flex" alignItems="center" justifyContent="center"
          w="20px" h="20px" cursor="grab" color="#CBD5E1"
          style={{ touchAction: 'none' }}
          _hover={{ color: '#94A3B8' }}
          title="드래그해서 순서 변경"
        >
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="3" cy="2.5" r="1.2"/><circle cx="7" cy="2.5" r="1.2"/>
            <circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/>
            <circle cx="3" cy="11.5" r="1.2"/><circle cx="7" cy="11.5" r="1.2"/>
          </svg>
        </Box>

        {/* Title */}
        <Flex alignItems="center" gap={2} style={{ paddingLeft: depth * 24 }}>
          <Chevron expanded={isExpanded} hasChildren={hasChildren} onToggle={onToggle} />
          <Text
            style={{
              fontSize: '14px', color: '#0F172A',
              fontWeight: depth === 0 ? 600 : 500,
              letterSpacing: '-0.1px',
            }}
          >
            {task.title}
          </Text>
        </Flex>

        {/* Assignee */}
        <Box><Avatar name={task.assignee} /></Box>

        {/* Status */}
        <Box>
          <StatusBadge status={task.status} onClick={handleStatusClick} />
        </Box>

        {/* Progress */}
        <ProgressBar value={task.progress} overdue={overdue} />

        {/* Deliverables */}
        <Box onClick={e => e.stopPropagation()}>
          <DeliverableSummary deliverables={task.deliverables ?? []} />
        </Box>

        {/* Period */}
        <Box style={{ fontSize: '12px', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
          {task.startDate || task.dueDate ? (
            <Flex alignItems="center" gap={1.5} flexWrap="wrap">
              <span>
                {fmtDate(task.startDate)}
                <span style={{ color: '#CBD5E1', margin: '0 3px' }}>→</span>
                <span style={{ color: overdue ? '#DC2626' : '#475569', fontWeight: overdue ? 600 : 400 }}>
                  {fmtDate(task.dueDate)}
                </span>
              </span>
              {overdue && <OverdueBadge />}
            </Flex>
          ) : (
            <span style={{ color: '#CBD5E1' }}>— 일정 없음 —</span>
          )}
        </Box>

        {/* Menu */}
        <Flex justifyContent="flex-end" onClick={e => e.stopPropagation()}>
          <RowMenu
            onEdit={onEdit}
            onAddChild={onAddChild}
            onDelete={() => setDeleteOpen(true)}
          />
        </Flex>
      </Box>

      <TaskDeleteDialog
        task={task}
        childCount={childCount}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={onRefresh}
      />
    </>
  )
}

function Chevron({ expanded, hasChildren, onToggle }: {
  expanded: boolean; hasChildren: boolean; onToggle: () => void
}) {
  if (!hasChildren) return <Box w="18px" flexShrink={0} />
  return (
    <Box
      as="button"
      aria-label={expanded ? '접기' : '펼치기'}
      onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggle() }}
      display="inline-flex" alignItems="center" justifyContent="center"
      w="18px" h="18px" borderRadius="4px"
      cursor="pointer" color="#64748B"
      bg="transparent" border="none" flexShrink={0}
    >
      <svg width="10" height="10" viewBox="0 0 10 10"
        style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
      >
        <path d="M3 1 L7 5 L3 9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </Box>
  )
}

function StatusBadge({ status, onClick }: { status: string; onClick: (e: React.MouseEvent) => void }) {
  const s = STATUS_MAP[status as keyof typeof STATUS_MAP] ?? STATUS_MAP.todo
  return (
    <Box
      as="span"
      display="inline-flex" alignItems="center" gap={1.5}
      px="10px" py="4px" borderRadius="999px"
      style={{ background: s.bg, color: s.fg, fontSize: '12px', fontWeight: 600, lineHeight: 1, cursor: 'pointer', whiteSpace: 'nowrap' }}
      onClick={onClick}
      title="클릭해서 상태 전환"
    >
      <Box as="span" w="6px" h="6px" borderRadius="50%" style={{ background: s.fg, opacity: 0.9, flexShrink: 0 }} />
      {s.label}
    </Box>
  )
}

function OverdueBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: '4px',
      background: '#FEE2E2', color: '#B91C1C',
      fontSize: '11px', fontWeight: 700, lineHeight: 1.4, letterSpacing: '0.2px',
    }}>지남 · OVERDUE</span>
  )
}

function ProgressBar({ value, overdue }: { value: number; overdue: boolean }) {
  return (
    <Flex alignItems="center" gap={2.5} minW="120px">
      <Box
        flex={1} h="6px" bg="#EEF2F6" borderRadius="999px"
        overflow="hidden" position="relative"
      >
        <Box
          h="100%" borderRadius="999px"
          style={{
            width: `${value}%`,
            background: overdue ? '#EF4444' : 'var(--c-accent)',
            transition: 'width 0.3s ease',
          }}
        />
      </Box>
      <Text style={{ fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '32px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {value}%
      </Text>
    </Flex>
  )
}

function Avatar({ name }: { name: string | null }) {
  if (!name) return <Text style={{ color: '#94A3B8', fontSize: '13px' }}>—</Text>
  const initial = name.replace(/\s.*/, '').slice(0, 1)
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360
  const bg = `oklch(0.88 0.06 ${h})`
  const fg = `oklch(0.35 0.10 ${h})`
  return (
    <Flex display="inline-flex" alignItems="center" gap={2}>
      <Box
        w="24px" h="24px" borderRadius="50%"
        display="inline-flex" alignItems="center" justifyContent="center"
        flexShrink={0}
        style={{ background: bg, color: fg, fontSize: '11px', fontWeight: 700 }}
      >
        {initial}
      </Box>
      <Text style={{ fontSize: '13px', color: '#1E293B' }}>{name}</Text>
    </Flex>
  )
}

const MENU_HEIGHT = 116 // 3 items × ~32px + padding

function RowMenu({ onEdit, onAddChild, onDelete }: {
  onEdit: () => void; onAddChild: () => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const openUpward = window.innerHeight - rect.bottom < MENU_HEIGHT + 8
      setPos({
        top: openUpward ? rect.top - MENU_HEIGHT - 4 : rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen(v => !v)
  }

  return (
    <Box position="relative">
      <button
        ref={btnRef}
        onClick={handleToggle}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{
          width: '28px', height: '28px', borderRadius: '6px', border: 'none',
          background: 'transparent', color: '#94A3B8', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
        aria-label="메뉴"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="3" cy="7" r="1.2" fill="currentColor"/>
          <circle cx="7" cy="7" r="1.2" fill="currentColor"/>
          <circle cx="11" cy="7" r="1.2" fill="currentColor"/>
        </svg>
      </button>
      {open && (
        <Portal>
          <Box
            position="fixed"
            style={{ top: pos.top, right: pos.right }}
            zIndex={200}
            bg="white" borderRadius="8px" border="1px solid #E2E8F0"
            boxShadow="0 4px 16px rgba(15,23,42,0.12)"
            py={1} minW="140px"
          >
            {[
              { label: '편집', onClick: () => { setOpen(false); onEdit() }, color: '#0F172A' },
              { label: '하위 작업 추가', onClick: () => { setOpen(false); onAddChild() }, color: '#0F172A' },
              { label: '삭제', onClick: () => { setOpen(false); onDelete() }, color: '#DC2626' },
            ].map(item => (
              <button
                key={item.label}
                onClick={e => { e.stopPropagation(); item.onClick() }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 14px', border: 'none', background: 'transparent',
                  fontSize: '13px', fontWeight: 500, color: item.color, cursor: 'pointer',
                }}
              >
                {item.label}
              </button>
            ))}
          </Box>
        </Portal>
      )}
    </Box>
  )
}
