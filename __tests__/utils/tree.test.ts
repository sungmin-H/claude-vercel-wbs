import { describe, it, expect } from 'vitest';
import { buildTree, flattenTree } from '@/lib/utils/tree';
import type { Task, TaskNode } from '@/types/task';

const makeTask = (id: string, parentId: string | null): Task => ({
  id,
  parentId,
  title: `Task ${id}`,
  description: null,
  assignee: null,
  status: 'todo',
  progress: 0,
  startDate: null,
  dueDate: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

describe('buildTree', () => {
  it('빈 배열이면 빈 배열을 반환한다', () => {
    expect(buildTree([])).toEqual([]);
  });

  it('단일 루트 노드는 children이 빈 배열인 TaskNode로 반환된다', () => {
    const result = buildTree([makeTask('a', null)]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
    expect(result[0].children).toEqual([]);
  });

  it('3단계 계층을 올바른 트리로 변환한다', () => {
    const tasks = [
      makeTask('root', null),
      makeTask('child', 'root'),
      makeTask('grandchild', 'child'),
    ];
    const result = buildTree(tasks);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('root');
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe('child');
    expect(result[0].children[0].children).toHaveLength(1);
    expect(result[0].children[0].children[0].id).toBe('grandchild');
  });

  it('orphan 노드(parentId가 존재하지 않는 ID)는 루트 레벨로 처리한다', () => {
    const tasks = [makeTask('orphan', 'nonexistent-id')];
    const result = buildTree(tasks);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('orphan');
    expect(result[0].children).toEqual([]);
  });
});

describe('flattenTree', () => {
  it('접힌 노드의 자손을 제외한 평면 배열을 반환한다', () => {
    const grandchild: TaskNode = { ...makeTask('gc', 'child'), children: [] };
    const child: TaskNode = { ...makeTask('child', 'root'), children: [grandchild] };
    const root: TaskNode = { ...makeTask('root', null), children: [child] };

    // root가 접힌 경우: root만 반환
    const collapsed = flattenTree([root], new Set(['root']));
    expect(collapsed.map((n) => n.id)).toEqual(['root']);
  });

  it('펼쳐진 트리는 모든 노드를 순서대로 반환한다', () => {
    const grandchild: TaskNode = { ...makeTask('gc', 'child'), children: [] };
    const child: TaskNode = { ...makeTask('child', 'root'), children: [grandchild] };
    const root: TaskNode = { ...makeTask('root', null), children: [child] };

    const all = flattenTree([root], new Set());
    expect(all.map((n) => n.id)).toEqual(['root', 'child', 'gc']);
  });
});
