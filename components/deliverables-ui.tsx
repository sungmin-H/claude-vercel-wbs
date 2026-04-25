'use client'

import { useState } from 'react'
import type { Deliverable, DeliverableType, DeliverableStatus } from '@/types/task'

export const DELIV_TYPE_MAP: Record<DeliverableType, { label: string; bg: string; fg: string }> = {
  doc:    { label: 'DOC',  bg: '#EFF6FF', fg: '#1D4ED8' },
  design: { label: 'DSN',  bg: '#F5F3FF', fg: '#6D28D9' },
  code:   { label: 'CODE', bg: '#ECFDF5', fg: '#065F46' },
  spec:   { label: 'SPEC', bg: '#FFF7ED', fg: '#C2410C' },
  data:   { label: 'DATA', bg: '#F0F9FF', fg: '#0369A1' },
  other:  { label: 'ETC',  bg: '#F8FAFC', fg: '#475569' },
}

const DELIV_STATUS_MAP: Record<DeliverableStatus, { label: string; dot: string }> = {
  'pending':     { label: '대기',    dot: '#CBD5E1' },
  'in-progress': { label: '진행 중', dot: '#3B82F6' },
  'done':        { label: '완료',    dot: '#10B981' },
}

const STATUS_CYCLE: Record<DeliverableStatus, DeliverableStatus> = {
  'pending': 'in-progress',
  'in-progress': 'done',
  'done': 'pending',
}

export function nextDelivStatus(s: DeliverableStatus): DeliverableStatus {
  return STATUS_CYCLE[s]
}

export function TypeBadge({ type }: { type: DeliverableType }) {
  const m = DELIV_TYPE_MAP[type] ?? DELIV_TYPE_MAP.other
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 6px', borderRadius: '4px',
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.3px',
      background: m.bg, color: m.fg, flexShrink: 0,
    }}>
      {m.label}
    </span>
  )
}

export function DeliverableSummary({ deliverables }: { deliverables: Deliverable[] }) {
  if (!deliverables.length) {
    return <span style={{ color: '#CBD5E1', fontSize: '12px' }}>—</span>
  }
  const doneCount = deliverables.filter(d => d.status === 'done').length
  const MAX = 5
  const shown = deliverables.slice(0, MAX)
  const rest = deliverables.length - MAX
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
        {shown.map(d => (
          <span
            key={d.id}
            title={`${d.name} · ${DELIV_STATUS_MAP[d.status as DeliverableStatus]?.label ?? d.status}`}
            style={{
              display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
              background: DELIV_STATUS_MAP[d.status as DeliverableStatus]?.dot ?? '#CBD5E1',
              flexShrink: 0,
            }}
          />
        ))}
        {rest > 0 && <span style={{ fontSize: '10px', color: '#94A3B8' }}>+{rest}</span>}
      </span>
      <span style={{
        fontSize: '11px', fontVariantNumeric: 'tabular-nums',
        color: doneCount === deliverables.length ? '#047857' : '#64748B',
      }}>
        {doneCount}/{deliverables.length}
      </span>
    </span>
  )
}

export function DeliverableListItem({
  deliverable,
  onStatusCycle,
  onDelete,
}: {
  deliverable: Deliverable
  onStatusCycle: () => void
  onDelete: () => void
}) {
  const s = DELIV_STATUS_MAP[deliverable.status as DeliverableStatus] ?? DELIV_STATUS_MAP.pending
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
      <TypeBadge type={deliverable.type as DeliverableType} />
      <span style={{ flex: 1, fontSize: '13px', color: '#1E293B', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {deliverable.name}
      </span>
      {deliverable.link && (
        <a href={deliverable.link} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', fontSize: '11px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          ↗
        </a>
      )}
      <button
        onClick={onStatusCycle}
        title="클릭해서 상태 전환"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          padding: '3px 7px', borderRadius: '999px',
          border: '1px solid #E2E8F0', background: 'white',
          cursor: 'pointer', whiteSpace: 'nowrap',
          fontSize: '11px', fontWeight: 600, color: '#475569',
        }}
      >
        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: s.dot }} />
        {s.label}
      </button>
      <button
        onClick={onDelete}
        title="삭제"
        style={{
          width: '22px', height: '22px', borderRadius: '4px', border: 'none',
          background: 'transparent', color: '#CBD5E1', cursor: 'pointer',
          fontSize: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}

export function StagedDeliverableItem({
  name,
  type,
  onRemove,
}: {
  name: string
  type: DeliverableType
  onRemove: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
      <TypeBadge type={type} />
      <span style={{ flex: 1, fontSize: '13px', color: '#1E293B' }}>{name}</span>
      <button
        onClick={onRemove}
        title="제거"
        style={{
          width: '20px', height: '20px', borderRadius: '4px', border: 'none',
          background: 'transparent', color: '#CBD5E1', cursor: 'pointer',
          fontSize: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ×
      </button>
    </div>
  )
}

export function AddDeliverableForm({ onAdd }: { onAdd: (name: string, type: DeliverableType) => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<DeliverableType>('doc')

  const handleAdd = () => {
    if (!name.trim()) return
    onAdd(name.trim(), type)
    setName('')
  }

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <select
        value={type}
        onChange={e => setType(e.target.value as DeliverableType)}
        style={{
          padding: '7px 8px', fontSize: '12px', fontWeight: 600,
          border: '1px solid #E2E8F0', borderRadius: '8px',
          background: 'white', color: '#475569', cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {(Object.keys(DELIV_TYPE_MAP) as DeliverableType[]).map(t => (
          <option key={t} value={t}>{DELIV_TYPE_MAP[t].label}</option>
        ))}
      </select>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
        placeholder="산출물 이름 (예: 화면 설계서)"
        style={{
          flex: 1, padding: '7px 10px', fontSize: '13px',
          border: '1px solid #E2E8F0', borderRadius: '8px',
          background: 'white', color: '#0F172A', outline: 'none',
          fontFamily: 'inherit',
        }}
      />
      <button
        onClick={handleAdd}
        style={{
          padding: '7px 12px', borderRadius: '8px', border: 'none',
          background: 'var(--c-accent)', color: 'white',
          fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        + 추가
      </button>
    </div>
  )
}
