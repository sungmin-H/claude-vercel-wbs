'use client'

import { Box, Flex, Text } from '@chakra-ui/react'

interface AppHeaderProps {
  active: 'list' | 'gantt'
  onViewChange: (v: 'list' | 'gantt') => void
  onAddTask: () => void
  onCsvExport: () => void
  onCsvImport: () => void
}

export function AppHeader({ active, onViewChange, onAddTask, onCsvExport, onCsvImport }: AppHeaderProps) {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      px="32px"
      py="20px"
      borderBottom="1px solid #EEF2F6"
      bg="white"
      flexShrink={0}
    >
      {/* Left: logo + view switcher */}
      <Flex alignItems="center" gap={8}>
        <Flex alignItems="center" gap="10px">
          <Box
            w="28px" h="28px" borderRadius="7px"
            bg="var(--c-accent)"
            display="flex" alignItems="center" justifyContent="center"
            style={{ color: 'white', fontWeight: 800, fontSize: '13px', letterSpacing: '-0.3px' }}
          >
            W
          </Box>
          <Box>
            <Text style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
              WBS
            </Text>
            <Text style={{ fontSize: '11px', color: '#94A3B8', marginTop: '-1px', lineHeight: 1.2 }}>
              Work Breakdown Structure
            </Text>
          </Box>
        </Flex>

        {/* View switcher */}
        <Flex bg="#F1F5F9" borderRadius="8px" p="3px" gap={0}>
          {([
            { id: 'list' as const, label: '목록', en: 'List' },
            { id: 'gantt' as const, label: '간트', en: 'Gantt' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: active === tab.id ? 'white' : 'transparent',
                color: active === tab.id ? '#0F172A' : '#64748B',
                boxShadow: active === tab.id ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none',
                fontSize: '12px', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'background 0.1s',
              }}
            >
              <span>{tab.label}</span>
              <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500 }}>{tab.en}</span>
            </button>
          ))}
        </Flex>
      </Flex>

      {/* Right: action buttons */}
      <Flex gap={2}>
        <button onClick={onCsvExport} style={ghostBtn}>
          <DownloadIcon />
          CSV 내보내기
        </button>
        <button onClick={onCsvImport} style={ghostBtn}>
          <UploadIcon />
          CSV 불러오기
        </button>
        <button onClick={onAddTask} style={primaryBtn}>
          <PlusIcon />
          작업 추가
        </button>
      </Flex>
    </Box>
  )
}

const ghostBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '8px 14px', borderRadius: '8px',
  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
  background: 'white', color: '#334155', border: '1px solid #E2E8F0',
}

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '8px 14px', borderRadius: '8px',
  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
  background: 'var(--c-accent)', color: 'white', border: '1px solid var(--c-accent)',
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v7m0 0l-3-3m3 3l3-3M2 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 9V2m0 0L4 5m3-3l3 3M2 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
