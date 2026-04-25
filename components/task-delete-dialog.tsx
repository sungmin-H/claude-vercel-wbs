'use client'

import { Box, Flex, Text, Portal } from '@chakra-ui/react'
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

  if (!open) return null

  return (
    <Portal>
      <Box
        position="fixed" inset={0} zIndex={200}
        style={{ background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        onClick={onClose}
      >
        <Box
          style={{ width: '420px', background: 'white', borderRadius: '14px', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)', overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}
        >
          <Box px="24px" pt="28px" pb="20px" textAlign="center">
            {/* Icon */}
            <Box
              w="56px" h="56px" mx="auto" mb={4} borderRadius="14px"
              display="flex" alignItems="center" justifyContent="center"
              style={{ background: '#FEE2E2', color: '#DC2626' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 7h14M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M7 7v12a2 2 0 002 2h6a2 2 0 002-2V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Box>

            <Text style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px', marginBottom: '10px' }}>
              작업을 삭제할까요?
            </Text>

            <Text style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6 }}>
              {childCount > 0 ? (
                <>
                  <b style={{ color: '#0F172A' }}>"{task.title}"</b>와 하위 작업{' '}
                  <b style={{ color: '#DC2626' }}>{childCount}개</b>가<br/>
                  모두 삭제됩니다. 되돌릴 수 없습니다.
                </>
              ) : (
                <>
                  <b style={{ color: '#0F172A' }}>"{task.title}"</b>이(가)<br/>
                  삭제됩니다. 되돌릴 수 없습니다.
                </>
              )}
            </Text>
          </Box>

          <Flex px="16px" pb="16px" gap={2}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px',
                background: 'white', border: '1px solid #E2E8F0',
                fontSize: '13px', fontWeight: 500, color: '#334155', cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px',
                background: '#DC2626', border: '1px solid #DC2626',
                fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer',
              }}
            >
              삭제
            </button>
          </Flex>
        </Box>
      </Box>
    </Portal>
  )
}
