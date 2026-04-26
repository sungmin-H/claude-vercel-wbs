import type { Task } from '@/types/task'
import type { TaskNode } from '@/types/task'

export type FlatRow = { node: TaskNode; depth: number }

export function toDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function mondayOf(d: Date): Date {
  const result = new Date(d)
  const day = result.getDay()
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1))
  result.setHours(0, 0, 0, 0)
  return result
}

export function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

export function dayDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function calcRange(tasks: Task[]): { start: Date; totalDays: number } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const withDates = tasks.filter(t => t.startDate && t.dueDate)
  let start: Date
  let end: Date

  if (withDates.length > 0) {
    const minTs = Math.min(...withDates.map(t => toDate(t.startDate!).getTime()))
    const maxTs = Math.max(...withDates.map(t => toDate(t.dueDate!).getTime()))
    start = addDays(new Date(minTs), -7)
    end = addDays(new Date(maxTs), 7)
    if (today < start) start = addDays(today, -7)
    if (today > end) end = addDays(today, 7)
  } else {
    start = addDays(today, -14)
    end = addDays(today, 6 * 7)
  }

  start = mondayOf(start)
  const weeks = Math.ceil(dayDiff(start, end) / 7)
  if (weeks < 8) end = addDays(start, 8 * 7)

  return { start, totalDays: dayDiff(start, addDays(end, 7)) }
}

export function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(task.dueDate) < today
}

export function flattenVisible(nodes: TaskNode[], collapsed: Set<string>, depth = 0): FlatRow[] {
  const result: FlatRow[] = []
  for (const node of nodes) {
    result.push({ node, depth })
    if (!collapsed.has(node.id)) {
      result.push(...flattenVisible(node.children, collapsed, depth + 1))
    }
  }
  return result
}
