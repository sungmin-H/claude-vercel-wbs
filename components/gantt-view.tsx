'use client'

import { useState } from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'
import type { Task } from '@/types/task'
import type { TaskNode } from '@/types/task'
import { buildTree } from '@/lib/utils/tree'

const DAY_W = 14 // px per day

interface Props {
  tasks: Task[]
}

type FlatRow = { node: TaskNode; depth: number }

function flattenVisible(nodes: TaskNode[], collapsed: Set<string>, depth = 0): FlatRow[] {
  const result: FlatRow[] = []
  for (const node of nodes) {
    result.push({ node, depth })
    if (!collapsed.has(node.id)) {
      result.push(...flattenVisible(node.children, collapsed, depth + 1))
    }
  }
  return result
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(task.dueDate) < today
}

function toDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function mondayOf(d: Date): Date {
  const result = new Date(d)
  const day = result.getDay()
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1))
  result.setHours(0, 0, 0, 0)
  return result
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

function dayDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function calcRange(tasks: Task[]): { start: Date; totalDays: number } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const withDates = tasks.filter(t => t.startDate && t.dueDate)
  let start: Date
  let end: Date

  if (withDates.length > 0) {
    const minTs = Math.min(...withDates.map(t => toDate(t.startDate!).getTime()))
    const maxTs = Math.max(...withDates.map(t => toDate(t.dueDate!).getTime()))
    start = addDays(new Date(minTs), -7)
    end = addDays(new Date(maxTs), 7)
    if (today < start) start = addDays(today, -7)
    if (today > end) end = addDays(today, 7)
  } else {
    start = addDays(today, -14)
    end = addDays(today, 6 * 7)
  }

  start = mondayOf(start)
  // Ensure minimum 8 weeks
  const weeks = Math.ceil(dayDiff(start, end) / 7)
  if (weeks < 8) end = addDays(start, 8 * 7)

  return { start, totalDays: dayDiff(start, addDays(end, 7)) }
}

export function GanttView({ tasks }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

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
              {rows.map(({ node, depth }, i) => (
                <Flex
                  key={node.id}
                  alignItems="center" gap={2}
                  px="16px" h="44px"
                  borderBottom={i < rows.length - 1 ? '1px solid #F8FAFC' : 'none'}
                  bg={depth > 0 ? '#FCFCFD' : 'white'}
                  style={{ paddingLeft: `${16 + depth * 18}px` }}
                >
                  <GanttChevron
                    expanded={!collapsed.has(node.id)}
                    hasChildren={node.children.length > 0}
                    onToggle={() => toggle(node.id)}
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
              ))}
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
