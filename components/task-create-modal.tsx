'use client'

import { useState } from 'react'
import {
  Dialog,
  Button,
  Field,
  Input,
  Textarea,
  NativeSelect,
  CloseButton,
  Portal,
  VStack,
} from '@chakra-ui/react'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function TaskCreateModal({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState('')
  const [status, setStatus] = useState('todo')
  const [progress, setProgress] = useState('0')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [titleError, setTitleError] = useState('')
  const [dateError, setDateError] = useState('')

  const reset = () => {
    setTitle(''); setDescription(''); setAssignee('')
    setStatus('todo'); setProgress('0')
    setStartDate(''); setDueDate('')
    setTitleError(''); setDateError('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    if (!title.trim()) {
      setTitleError('제목을 입력해 주세요.')
      return
    }
    if (startDate && dueDate && dueDate < startDate) {
      setDateError('목표 기한은 시작일 이후여야 합니다')
      return
    }
    setTitleError(''); setDateError('')

    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description || null,
        assignee: assignee || null,
        status,
        progress: Number(progress),
        startDate: startDate || null,
        dueDate: dueDate || null,
      }),
    })
    reset()
    onCreated()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="480px">
            <Dialog.Header>
              <Dialog.Title>새 작업 추가</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={3} align="stretch">
                <Field.Root required invalid={!!titleError}>
                  <Field.Label>제목</Field.Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="작업 제목"
                  />
                  {titleError && <Field.ErrorText>{titleError}</Field.ErrorText>}
                </Field.Root>

                <Field.Root>
                  <Field.Label>설명</Field.Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="선택"
                    rows={3}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>담당자</Field.Label>
                  <Input
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="선택"
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>상태</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="todo">할 일</option>
                      <option value="doing">진행 중</option>
                      <option value="done">완료</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>

                <Field.Root>
                  <Field.Label>진행률 (0~100)</Field.Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={progress}
                    onChange={(e) => setProgress(e.target.value)}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>시작일</Field.Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </Field.Root>

                <Field.Root invalid={!!dateError}>
                  <Field.Label>목표 기한</Field.Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                  {dateError && <Field.ErrorText>{dateError}</Field.ErrorText>}
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer gap={2}>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" onClick={handleClose}>취소</Button>
              </Dialog.ActionTrigger>
              <Button onClick={handleSave}>저장</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
