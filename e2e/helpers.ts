import type { APIRequestContext } from '@playwright/test';

export async function cleanupTasks(request: APIRequestContext) {
  const res = await request.get('/api/tasks');
  const tasks: Array<{ id: string; parentId: string | null }> = await res.json();
  // 자식 먼저 삭제 → 부모 삭제 (고아 레코드 포함 전체 제거)
  for (const task of tasks.filter((t) => t.parentId !== null)) {
    await request.delete(`/api/tasks/${task.id}`);
  }
  for (const task of tasks.filter((t) => t.parentId === null)) {
    await request.delete(`/api/tasks/${task.id}`);
  }
}
