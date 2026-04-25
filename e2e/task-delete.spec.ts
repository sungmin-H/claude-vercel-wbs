import { test, expect } from '@playwright/test';
import { cleanupTasks } from './helpers';

test.beforeEach(async ({ request }) => {
  await cleanupTasks(request);

  // 부모 task 생성
  const parentRes = await request.post('/api/tasks', {
    data: { title: '기획 회의' },
  });
  const parent = await parentRes.json();

  // 자식 task 생성
  await request.post('/api/tasks', {
    data: { title: '아젠다 초안 작성', parentId: parent.id },
  });
});

test('J8 — 하위를 가진 작업 삭제', async ({ page }) => {
  await page.goto('/');

  // 첫 번째 ⋯ 메뉴 클릭 (부모 작업 "기획 회의" 행)
  await page.getByRole('button', { name: '메뉴' }).first().click();
  await page.getByRole('button', { name: '삭제' }).click();

  // 확인 다이얼로그 문구 검증
  await expect(page.getByText('작업을 삭제할까요?')).toBeVisible();
  await expect(page.getByText('하위 작업 1개')).toBeVisible();

  await page.getByRole('button', { name: '삭제' }).click();

  // 두 행 모두 사라짐
  await expect(page.getByText('기획 회의', { exact: true })).not.toBeVisible();
  await expect(page.getByText('아젠다 초안 작성', { exact: true })).not.toBeVisible();

  // 새로고침 후에도 복구 안 됨
  await page.reload();
  await expect(page.getByText('기획 회의', { exact: true })).not.toBeVisible();
});
