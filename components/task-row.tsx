'use client'

import { useState } from 'react'
import { Table, Badge, Text, Progress, Menu, IconButton, HStack } from '@chakra-ui/react'
import type { Task } from '@/types/task'
import { TaskDeleteDialog } from '@/components/task-delete-dialog'

const STATUS_MAP: Record<string, { label: string; colorPalette: string }> = {
  todo:  { label: '할 일',  colorPalette: 'gray'   },
  doing: { label: '진행 중', colorPalette: 'blue'  },
  done:  { label: '완료',   colorPalette: 'green'  },
}

interface Props {
  task: Task
  allTasks: Task[]
  onDeleted: () => void
}

export function TaskRow({ task, allTasks, onDeleted }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false)

  const childCount = allTasks.filter((t) => t.parentId === task.id).length
  const status = STATUS_MAP[task.status] ?? STATUS_MAP.todo

  const period =
    task.startDate || task.dueDate
      ? `${task.startDate ?? '?'} ~ ${task.dueDate ?? '?'}`
      : null

  return (
    <>
      <Table.Row>
        <Table.Cell>{task.title}</Table.Cell>
        <Table.Cell>{task.assignee ?? '—'}</Table.Cell>
        <Table.Cell>
          <Badge colorPalette={status.colorPalette}>{status.label}</Badge>
        </Table.Cell>
        <Table.Cell>
          <HStack gap={2}>
            <Text fontSize="sm" whiteSpace="nowrap">{task.progress}%</Text>
            <Progress.Root value={task.progress} minW="60px" maxW="80px" size="xs">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          </HStack>
        </Table.Cell>
        <Table.Cell whiteSpace="nowrap">{period ?? '—'}</Table.Cell>
        <Table.Cell>
          <Menu.Root>
            <Menu.Trigger asChild>
              <IconButton variant="ghost" size="xs" aria-label="메뉴">
                ⋯
              </IconButton>
            </Menu.Trigger>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.Item
                  value="delete"
                  color="red.500"
                  onClick={() => setDeleteOpen(true)}
                >
                  삭제
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Menu.Root>
        </Table.Cell>
      </Table.Row>

      <TaskDeleteDialog
        task={task}
        childCount={childCount}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={onDeleted}
      />
    </>
  )
}
