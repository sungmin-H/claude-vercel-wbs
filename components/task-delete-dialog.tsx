'use client'

import { Dialog, Button, Text, Portal } from '@chakra-ui/react'
import type { Task } from '@/types/task'

interface Props {
  task: Task
  childCount: number
  open: boolean
  onClose: () => void
  onDeleted: () => void
}

export function TaskDeleteDialog({ task, childCount, open, onClose, onDeleted }: Props) {
  const handleConfirm = async () => {
    await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    onClose()
    onDeleted()
  }

  const message =
    childCount > 0
      ? `이 작업과 하위 작업 ${childCount}개가 모두 삭제됩니다. 계속할까요?`
      : '이 작업을 삭제합니다. 계속할까요?'

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => !e.open && onClose()}
      role="alertdialog"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>작업 삭제</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>{message}</Text>
            </Dialog.Body>
            <Dialog.Footer gap={2}>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" onClick={onClose}>취소</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="red" onClick={handleConfirm}>확인</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
