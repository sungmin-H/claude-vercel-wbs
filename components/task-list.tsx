'use client'

import { Table, Text, VStack } from '@chakra-ui/react'
import type { Task } from '@/types/task'
import { TaskRow } from '@/components/task-row'

interface Props {
  tasks: Task[]
  onTaskDeleted: () => void
}

export function TaskList({ tasks, onTaskDeleted }: Props) {
  if (tasks.length === 0) {
    return (
      <VStack py={16}>
        <Text color="gray.500">
          아직 작업이 없습니다. 첫 작업을 추가해 시작하세요.
        </Text>
      </VStack>
    )
  }

  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>제목</Table.ColumnHeader>
          <Table.ColumnHeader>담당자</Table.ColumnHeader>
          <Table.ColumnHeader>상태</Table.ColumnHeader>
          <Table.ColumnHeader>진행률</Table.ColumnHeader>
          <Table.ColumnHeader>기간</Table.ColumnHeader>
          <Table.ColumnHeader />
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            allTasks={tasks}
            onDeleted={onTaskDeleted}
          />
        ))}
      </Table.Body>
    </Table.Root>
  )
}
