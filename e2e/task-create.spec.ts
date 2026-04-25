import { test, expect } from '@playwright/test';
import { cleanupTasks } from './helpers';

test.beforeEach(async ({ request }) => {
  await cleanupTasks(request);
});

test('J2 — 최상위 작업 추가', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '작업 추가' }).click();

  await page.getByLabel('제목').fill('기획 회의');
  await page.getByLabel('담당자').fill('김PM');
  await page.getByLabel('시작일').fill('2026-05-01');
  await page.getByLabel('목표 기한').fill('2026-05-03');
  await page.getByRole('button', { name: '작업 만들기' }).click();

  // 모달 닫힘
  await expect(page.getByText('새로운 작업을 만듭니다')).not.toBeVisible();

  // 목록에 새 행 반영
  await expect(page.getByText('기획 회의', { exact: true })).toBeVisible();
  await expect(page.getByText('김PM', { exact: true })).toBeVisible();
  await expect(page.getByText('할 일')).toBeVisible();
  await expect(page.getByText('0%')).toBeVisible();

  // 빈 상태 안내 사라짐
  await expect(page.getByText('아직 작업이 없습니다')).not.toBeVisible();
});

test('J17 — 목표 기한이 시작일보다 앞이면 저장 실패', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '작업 추가' }).click();

  await page.getByLabel('제목').fill('테스트 작업');
  await page.getByLabel('시작일').fill('2026-05-10');
  await page.getByLabel('목표 기한').fill('2026-05-05');
  await page.getByRole('button', { name: '작업 만들기' }).click();

  // 모달 유지 (저장 안 됨)
  await expect(page.getByText('새로운 작업을 만듭니다')).toBeVisible();
  await expect(
    page.getByText('목표 기한은 시작일 이후여야 합니다')
  ).toBeVisible();
});
