import { test, expect } from '@playwright/test';
import { cleanupTasks } from './helpers';

test.beforeEach(async ({ request }) => {
  await cleanupTasks(request);
});

test('J1 — 빈 상태 화면', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByText('아직 작업이 없습니다. 첫 작업을 추가해 시작하세요')
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '+ 작업 추가' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'CSV 내보내기' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'CSV 불러오기' })).toBeVisible();
});
