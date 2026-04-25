import type { APIRequestContext } from '@playwright/test';

export async function cleanupTasks(request: APIRequestContext) {
  const res = await request.get('/api/tasks');
  const tasks: Array<{ id: string; parentId: string | null }> = await res.json();
  // 루트 task만 삭제 — cascade FK가 하위 task를 자동 제거
  for (const task of tasks.filter((t) => t.parentId === null)) {
    await request.delete(`/api/tasks/${task.id}`);
  }
}
