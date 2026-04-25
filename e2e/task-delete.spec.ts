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

  // ⋯ 메뉴 → 삭제 (aria-label="메뉴" 기준)
  const parentRow = page.getByRole('row', { name: /기획 회의/ });
  await parentRow.getByRole('button', { name: '메뉴' }).click();
  await page.getByRole('menuitem', { name: '삭제' }).click();

  // 확인 다이얼로그 문구 검증
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(
    page.getByText('이 작업과 하위 작업 1개가 모두 삭제됩니다. 계속할까요?')
  ).toBeVisible();

  await page.getByRole('button', { name: '확인' }).click();

  // 두 행 모두 사라짐
  await expect(page.getByRole('cell', { name: '기획 회의' })).not.toBeVisible();
  await expect(page.getByRole('cell', { name: '아젠다 초안 작성' })).not.toBeVisible();

  // 새로고침 후에도 복구 안 됨
  await page.reload();
  await expect(page.getByRole('cell', { name: '기획 회의' })).not.toBeVisible();
});
