'use client'

import { useState } from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '@/types/task'
import type { TaskNode } from '@/types/task'
import { buildTree } from '@/lib/utils/tree'
import {
  toDate,
  mondayOf,
  addDays,
  dayDiff,
  calcRange,
  isOverdue,
  flattenVisible,
  type FlatRow,
} from '@/lib/utils/gantt'

const DAY_W = 14 // px per day

interface Props {
  tasks: Task[]
  onReorder: (newTasks: Task[]) => void
}

export function GanttView({ tasks, onReorder }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const tree = buildTree(tasks)
  const rows = flattenVisible(tree, collapsed)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { start: rangeStart, totalDays } = calcRange(tasks)

  const todayOffset = dayDiff(rangeStart, today) * DAY_W

  // Build weeks array
  const numWeeks = Math.ceil(totalDays / 7)
  const weeks: Date[] = []
  for (let w = 0; w < numWeeks; w++) {
    weeks.push(addDays(rangeStart, w * 7))
  }

  // Group weeks by month
  const monthGroups: { label: string; count: number }[] = []
  let cur: { month: number; count: number; label: string } | null = null
  for (const d of weeks) {
    const m = d.getMonth()
    if (!cur || cur.month !== m) {
      const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`
      cur = { month: m, count: 1, label }
      monthGroups.push(cur)
    } else {
      cur.count++
    }
  }

  const fmtWeek = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`

  const toggle = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeTask = tasks.find(t => t.id === active.id)
    const overTask = tasks.find(t => t.id === over.id)
    if (!activeTask || !overTask) return
    if (activeTask.parentId !== overTask.parentId) return

    const siblings = tasks
      .filter(t => t.parentId === activeTask.parentId)
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))

    const oldIdx = siblings.findIndex(t => t.id === active.id)
    const newIdx = siblings.findIndex(t => t.id === over.id)
    const reordered = arrayMove(siblings, oldIdx, newIdx)

    const items = reordered.map((t, i) => ({ id: t.id, order: i }))
    const updatedSiblings = new Map(items.map(({ id, order }) => [id, order]))
    const newTasks = tasks.map(t => updatedSiblings.has(t.id) ? { ...t, order: updatedSiblings.get(t.id)! } : t)
    onReorder(newTasks)

    await fetch('/api/tasks/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
  }

  return (
    <Box flex={1} overflow="auto">
      {/* Info bar */}
      <Flex px="32px" pt="20px" pb="12px" gap={3.5} alignItems="center">
        <Text style={{ fontSize: '12px', color: '#64748B' }}>주 단위 그리드 · Weekly grid</Text>
        <Box w="1px" h="12px" bg="#E2E8F0" />
        <Text style={{ fontSize: '12px', color: '#64748B' }}>읽기 전용 · Read only</Text>
        <Text style={{ marginLeft: 'auto', fontSize: '12px', color: '#94A3B8' }}>
          오늘 · {today.toISOString().slice(0, 10)}
        </Text>
      </Flex>

      <Box px="32px" pb="32px">
        <Box bg="white" borderRadius="12px" border="1px solid #E2E8F0" overflow="hidden">
          <Flex>
            {/* Left: task list */}
            <Box w="320px" flexShrink={0} borderRight="1px solid #EEF2F6">
              <Box
                px="16px" py="12px"
                borderBottom="1px solid #EEF2F6"
                h="56px" display="flex" alignItems="flex-end" pb="12px"
              >
                <Text style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  작업 · Task
                </Text>
              </Box>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={rows.map(r => r.node.id)} strategy={verticalListSortingStrategy}>
                  {rows.map(({ node, depth }, i) => (
                    <SortableGanttRow
                      key={node.id}
                      node={node}
                      depth={depth}
                      isLast={i === rows.length - 1}
                      collapsed={collapsed}
                      onToggle={toggle}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </Box>

            {/* Right: Gantt grid */}
            <Box flex={1} overflowX="auto" position="relative">
              <Box style={{ width: totalDays * DAY_W, position: 'relative' }}>
                {/* Month header */}
                <Flex h="28px" borderBottom="1px solid #EEF2F6">
                  {monthGroups.map((g, i) => (
                    <Box
                      key={i}
                      style={{ width: g.count * 7 * DAY_W, borderRight: i < monthGroups.length - 1 ? '1px solid #EEF2F6' : 'none' }}
                      display="flex" alignItems="center" pl="12px"
                    >
                      <Text style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>{g.label}</Text>
                    </Box>
                  ))}
                </Flex>

                {/* Week header */}
                <Flex h="28px" borderBottom="1px solid #EEF2F6">
                  {weeks.map((d, i) => (
                    <Box
                      key={i}
                      style={{ width: 7 * DAY_W, borderRight: '1px solid #F1F5F9' }}
                      display="flex" alignItems="center" justifyContent="center"
                    >
                      <Text style={{ fontSize: '11px', color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtWeek(d)}
                      </Text>
                    </Box>
                  ))}
                </Flex>

                {/* Today line */}
                {todayOffset >= 0 && todayOffset < totalDays * DAY_W && (
                  <Box
                    position="absolute"
                    style={{ left: todayOffset, top: 0, bottom: 0, width: 2, background: 'var(--c-accent)', opacity: 0.85, zIndex: 5, pointerEvents: 'none' }}
                  >
                    <Box
                      position="absolute"
                      style={{
                        top: 4, left: -22,
                        background: 'var(--c-accent)', color: 'white',
                        fontSize: '10px', fontWeight: 700, padding: '2px 6px',
                        borderRadius: '4px', letterSpacing: '0.3px',
                      }}
                    >
                      TODAY
                    </Box>
                  </Box>
                )}

                {/* Week guidelines */}
                {weeks.map((_, i) => (
                  <Box
                    key={i}
                    position="absolute"
                    style={{ left: i * 7 * DAY_W, top: 56, bottom: 0, width: 1, background: '#F1F5F9', pointerEvents: 'none' }}
                  />
                ))}

                {/* Task bars */}
                {rows.map(({ node }, i) => {
                  const overdue = isOverdue(node)
                  const accent = overdue ? '#DC2626' : 'var(--c-accent)'
                  const accentSoft = overdue ? '#FECACA' : 'var(--c-accent-soft)'

                  const rowH = 44
                  const rowStyle: React.CSSProperties = {
                    height: rowH,
                    position: 'relative',
                    borderBottom: i < rows.length - 1 ? '1px solid #F8FAFC' : 'none',
                    background: rows[i].depth > 0 ? '#FCFCFD' : 'white',
                  }

                  if (!node.startDate || !node.dueDate) {
                    return (
                      <div key={node.id} style={rowStyle}>
                        <span style={{
                          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                          fontSize: '11px', color: '#CBD5E1', fontStyle: 'italic',
                        }}>— 일정 없음 · No schedule —</span>
                      </div>
                    )
                  }

                  const off = dayDiff(rangeStart, toDate(node.startDate)) * DAY_W
                  const w = Math.max(DAY_W, (dayDiff(toDate(node.startDate), toDate(node.dueDate)) + 1) * DAY_W)
                  const fill = (node.progress / 100) * w

                  return (
                    <div key={node.id} style={rowStyle}>
                      <div style={{
                        position: 'absolute', left: off, top: 10, height: 24, width: w,
                        borderRadius: 6, background: accentSoft,
                        border: overdue ? '1.5px solid #DC2626' : '1px solid rgba(0,0,0,0.04)',
                        overflow: 'hidden',
                        boxShadow: overdue ? 'none' : '0 1px 2px rgba(15,23,42,0.04)',
                      }}>
                        <div style={{
                          width: fill, height: '100%', background: accent,
                          backgroundImage: overdue
                            ? 'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(255,255,255,0.25) 4px, rgba(255,255,255,0.25) 8px)'
                            : 'none',
                        }} />
                        <div style={{
                          position: 'absolute', left: 8, top: 0, height: '100%',
                          display: 'flex', alignItems: 'center',
                          fontSize: '10px', fontWeight: 700, color: 'white',
                          mixBlendMode: 'difference', letterSpacing: '0.3px',
                        }}>
                          {node.progress}%{overdue && ' · 지남'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </Box>
            </Box>
          </Flex>
        </Box>

        {/* Legend */}
        <Flex gap={5} pt="14px" px="4px" style={{ fontSize: '11px', color: '#64748B' }}>
          <Flex alignItems="center" gap={1.5}>
            <Box w="18px" h="10px" borderRadius="3px" bg="var(--c-accent)" />
            진행 완료 영역
          </Flex>
          <Flex alignItems="center" gap={1.5}>
            <Box w="18px" h="10px" borderRadius="3px" bg="var(--c-accent-soft)" />
            남은 예정
          </Flex>
          <Flex alignItems="center" gap={1.5}>
            <Box w="18px" h="10px" borderRadius="3px" border="1.5px solid #DC2626" bg="#FECACA" />
            Overdue (지남)
          </Flex>
          <Flex alignItems="center" gap={1.5}>
            <Box w="2px" h="12px" bg="var(--c-accent)" />
            오늘 · Today
          </Flex>
        </Flex>
      </Box>
    </Box>
  )
}

function SortableGanttRow({ node, depth, isLast, collapsed, onToggle }: {
  node: TaskNode; depth: number; isLast: boolean; collapsed: Set<string>; onToggle: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id })
  return (
    <Flex
      ref={setNodeRef}
      alignItems="center" gap={1}
      px="16px" h="44px"
      borderBottom={isLast ? 'none' : '1px solid #F8FAFC'}
      bg={depth > 0 ? '#FCFCFD' : 'white'}
      style={{
        paddingLeft: `${8 + depth * 18}px`,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {/* Drag handle */}
      <Box
        {...attributes}
        {...listeners}
        display="flex" alignItems="center" justifyContent="center"
        w="16px" h="16px" cursor="grab" color="#CBD5E1" flexShrink={0}
        style={{ touchAction: 'none' }}
        _hover={{ color: '#94A3B8' }}
        title="드래그해서 순서 변경"
      >
        <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
          <circle cx="2.5" cy="2" r="1"/><circle cx="5.5" cy="2" r="1"/>
          <circle cx="2.5" cy="6" r="1"/><circle cx="5.5" cy="6" r="1"/>
          <circle cx="2.5" cy="10" r="1"/><circle cx="5.5" cy="10" r="1"/>
        </svg>
      </Box>
      <GanttChevron
        expanded={!collapsed.has(node.id)}
        hasChildren={node.children.length > 0}
        onToggle={() => onToggle(node.id)}
      />
      <Text
        flex={1}
        style={{
          fontSize: '13px', color: '#0F172A',
          fontWeight: depth === 0 ? 600 : 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {node.title}
      </Text>
      <Text style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginLeft: 'auto' }}>
        {node.progress}%
      </Text>
    </Flex>
  )
}

function GanttChevron({ expanded, hasChildren, onToggle }: {
  expanded: boolean; hasChildren: boolean; onToggle: () => void
}) {
  if (!hasChildren) return <Box w="18px" flexShrink={0} />
  return (
    <Box
      as="button"
      onClick={onToggle}
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
