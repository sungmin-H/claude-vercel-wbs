import type { Task, TaskNode } from '@/types/task';

export function buildTree(tasks: Task[]): TaskNode[] {
  const map = new Map<string, TaskNode>();
  for (const t of tasks) map.set(t.id, { ...t, children: [] });

  const roots: TaskNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function flattenTree(nodes: TaskNode[], collapsedIds: Set<string>): TaskNode[] {
  const result: TaskNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (!collapsedIds.has(node.id)) {
      result.push(...flattenTree(node.children, collapsedIds));
    }
  }
  return result;
}
