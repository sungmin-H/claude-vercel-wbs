'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Box } from '@chakra-ui/react'
import type { Task } from '@/types/task'
import { AppHeader } from '@/components/app-header'
import { TaskList } from '@/components/task-list'
import { GanttView } from '@/components/gantt-view'
import { TaskCreateModal } from '@/components/task-create-modal'
import { TaskEditModal } from '@/components/task-edit-modal'
import { CsvImportModal, parseCsvPreview } from '@/components/csv-import-modal'

interface CsvPreviewData {
  filename: string
  rows: ReturnType<typeof parseCsvPreview>
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'gantt'>('list')

  const [createOpen, setCreateOpen] = useState(false)
  const [parentForCreate, setParentForCreate] = useState<string | null>(null)

  const [editTask, setEditTask] = useState<Task | null>(null)

  const [csvPreviewData, setCsvPreviewData] = useState<CsvPreviewData | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    const data = await res.json()
    setTasks(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleAddTask = () => {
    setParentForCreate(null)
    setCreateOpen(true)
  }

  const handleAddChild = (parentId: string) => {
    setParentForCreate(parentId)
    setCreateOpen(true)
  }

  const handleCreateClose = () => {
    setCreateOpen(false)
    setParentForCreate(null)
  }

  const handleCreated = () => {
    setCreateOpen(false)
    setParentForCreate(null)
    fetchTasks()
  }

  const handleEditClose = () => setEditTask(null)

  const handleSaved = () => {
    setEditTask(null)
    fetchTasks()
  }

  const handleCsvExport = () => {
    const header = ['제목', '설명', '담당자', '상태', '진행률', '시작일', '목표 기한', '상위 작업 제목']
    const rows = tasks.map(t => [
      t.title,
      t.description ?? '',
      t.assignee ?? '',
      t.status,
      String(t.progress),
      t.startDate ?? '',
      t.dueDate ?? '',
      tasks.find(p => p.id === t.parentId)?.title ?? '',
    ])
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wbs-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCsvImportClick = () => {
    csvInputRef.current?.click()
  }

  const handleCsvFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const rows = parseCsvPreview(text, tasks)
    setCsvPreviewData({ filename: file.name, rows })
    e.target.value = ''
  }

  const handleCsvImportClose = () => setCsvPreviewData(null)

  const handleImported = () => {
    setCsvPreviewData(null)
    fetchTasks()
  }

  return (
    <Box display="flex" flexDirection="column" h="100vh" bg="#F1F5F9">
      <AppHeader
        active={view}
        onViewChange={setView}
        onAddTask={handleAddTask}
        onCsvExport={handleCsvExport}
        onCsvImport={handleCsvImportClick}
      />

      {!loading && (
        view === 'list' ? (
          <TaskList
            tasks={tasks}
            onEdit={setEditTask}
            onAddChild={handleAddChild}
            onRefresh={fetchTasks}
          />
        ) : (
          <GanttView tasks={tasks} />
        )
      )}

      {/* Hidden CSV file input */}
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleCsvFileSelect}
      />

      {/* Modals */}
      <TaskCreateModal
        open={createOpen}
        parentId={parentForCreate}
        allTasks={tasks}
        onClose={handleCreateClose}
        onCreated={handleCreated}
      />

      {editTask && (
        <TaskEditModal
          task={editTask}
          allTasks={tasks}
          open={!!editTask}
          onClose={handleEditClose}
          onSaved={handleSaved}
        />
      )}

      <CsvImportModal
        open={!!csvPreviewData}
        previewData={csvPreviewData}
        onClose={handleCsvImportClose}
        onImported={handleImported}
      />
    </Box>
  )
}
