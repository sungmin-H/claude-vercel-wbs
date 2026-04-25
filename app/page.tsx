'use client'

import { useState, useEffect, useCallback } from 'react'
import { Box, Flex, Heading, Button } from '@chakra-ui/react'
import type { Task } from '@/types/task'
import { TaskList } from '@/components/task-list'
import { TaskCreateModal } from '@/components/task-create-modal'

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    const data = await res.json()
    setTasks(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <Flex mb={4} align="center" justify="space-between">
        <Heading size="lg">WBS</Heading>
        <Flex gap={2}>
          <Button onClick={() => setCreateOpen(true)}>+ 작업 추가</Button>
          <Button variant="outline" disabled>CSV 내보내기</Button>
          <Button variant="outline" disabled>CSV 불러오기</Button>
        </Flex>
      </Flex>

      {!loading && (
        <TaskList tasks={tasks} onTaskDeleted={fetchTasks} />
      )}

      <TaskCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); fetchTasks() }}
      />
    </Box>
  )
}
