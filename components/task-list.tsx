'use client'

import { useState } from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'
import type { Task } from '@/types/task'
import type { TaskNode } from '@/types/task'
import { buildTree } from '@/lib/utils/tree'
import { TaskRow } from '@/components/task-row'

interface Props {
  tasks: Task[]
  onEdit: (task: Task) => void
  onAddChild: (parentId: string) => void
  onRefresh: () => void
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

export function TaskList({ tasks, onEdit, onAddChild, onRefresh }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const tree = buildTree(tasks)
  const rows = flattenVisible(tree, collapsed)

  const toggle = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (tasks.length === 0) {
    return (
      <Box flex={1} display="flex" alignItems="center" justifyContent="center" p="40px">
        <Box textAlign="center" maxW="420px">
          <Box
            w="88px" h="88px" mx="auto" mb={6} borderRadius="20px"
            style={{
              background: 'linear-gradient(135deg, var(--c-accent-soft), #F1F5F9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #E2E8F0',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="6" y="9" width="28" height="3" rx="1.5" fill="var(--c-accent)" opacity="0.9"/>
              <rect x="10" y="17" width="20" height="3" rx="1.5" fill="var(--c-accent)" opacity="0.55"/>
              <rect x="10" y="25" width="14" height="3" rx="1.5" fill="var(--c-accent)" opacity="0.3"/>
            </svg>
          </Box>
          <Text style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.3px', marginBottom: '10px' }}>
            아직 작업이 없습니다
          </Text>
          <Text style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, marginBottom: '28px' }}>
            첫 작업을 추가해 시작하세요.<br/>
            엑셀에서 만든 WBS가 있다면 CSV로 한 번에 가져올 수도 있어요.
          </Text>
        </Box>
      </Box>
    )
  }

  const doneCount = tasks.filter(t => t.status === 'done').length
  const doingCount = tasks.filter(t => t.status === 'doing').length
  const overdueCount = tasks.filter(t => isOverdue(t)).length
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <Box flex={1} overflow="auto">
      {/* Stats bar */}
      <Flex px="32px" pt="20px" pb="12px" gap={3.5} alignItems="center" flexWrap="wrap">
        <Text style={{ fontSize: '12px', color: '#64748B' }}>총 {tasks.length}개 작업</Text>
        <Divider />
        <Text style={{ fontSize: '12px', color: '#64748B' }}>
          진행 중 <b style={{ color: '#0F172A' }}>{doingCount}</b>
        </Text>
        <Text style={{ fontSize: '12px', color: '#64748B' }}>
          완료 <b style={{ color: '#0F172A' }}>{doneCount}</b>
        </Text>
        {overdueCount > 0 && (
          <Text style={{ fontSize: '12px', color: '#B91C1C' }}>
            지남 <b>{overdueCount}</b>
          </Text>
        )}
        <Text style={{ marginLeft: 'auto', fontSize: '12px', color: '#94A3B8' }}>
          오늘 · {todayStr}
        </Text>
      </Flex>

      <Box px="32px" pb="32px">
        <Box bg="white" borderRadius="12px" border="1px solid #E2E8F0" overflow="hidden">
          {/* Table header */}
          <Box
            display="grid"
            style={{ gridTemplateColumns: '1fr 150px 100px 170px 120px 175px 36px' }}
            px="18px" py="12px"
            borderBottom="1px solid #EEF2F6"
          >
            {['제목 · Title', '담당자', '상태', '진행률', '산출물', '기간', ''].map((h, i) => (
              <Text key={i} style={{
                fontSize: '11px', fontWeight: 600, color: '#94A3B8',
                textTransform: 'uppercase', letterSpacing: '0.6px',
              }}>
                {h}
              </Text>
            ))}
          </Box>

          {/* Rows */}
          {rows.map(({ node, depth }) => (
            <TaskRow
              key={node.id}
              task={node}
              depth={depth}
              hasChildren={node.children.length > 0}
              isExpanded={!collapsed.has(node.id)}
              allTasks={tasks}
              onToggle={() => toggle(node.id)}
              onEdit={() => onEdit(node)}
              onAddChild={() => onAddChild(node.id)}
              onRefresh={onRefresh}
            />
          ))}
        </Box>
      </Box>
    </Box>
  )
}

function Divider() {
  return <Box w="1px" h="12px" bg="#E2E8F0" />
}
