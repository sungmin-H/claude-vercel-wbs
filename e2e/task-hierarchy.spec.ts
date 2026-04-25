import { test, expect } from '@playwright/test';
import { cleanupTasks } from './helpers';

test.beforeEach(async ({ request }) => {
  await cleanupTasks(request);
});

test('J3 — 하위 작업 추가 및 계층 표시', async ({ page, request }) => {
  // Given: 최상위 작업 "기획 회의" 존재
  await request.post('/api/tasks', { data: { title: '기획 회의' } });
  await page.goto('/');

  // When: ⋯메뉴 → 하위 작업 추가 → "아젠다 초안 작성" 저장
  await page.getByRole('button', { name: '메뉴' }).first().click();
  await page.getByRole('button', { name: '하위 작업 추가' }).click();
  await page.getByLabel('제목').fill('아젠다 초안 작성');
  await page.getByRole('button', { name: '작업 만들기' }).click();

  // Then: "기획 회의" 행 왼쪽에 접기 아이콘(▼) 표시
  await expect(page.getByRole('button', { name: '접기' })).toBeVisible();

  // Then: "아젠다 초안 작성" 행이 목록에 표시됨
  await expect(page.getByText('아젠다 초안 작성', { exact: true })).toBeVisible();

  // Then: "아젠다 초안 작성" 행 클릭 → 편집 모달에 상위 작업 "기획 회의" 표시
  await page.getByText('아젠다 초안 작성', { exact: true }).click();
  await expect(page.getByText('상위 작업', { exact: false })).toBeVisible();
  await expect(page.getByText('기획 회의', { exact: true }).last()).toBeVisible();
});

test('J4 — 계층 접기/펼치기 토글', async ({ page, request }) => {
  // Given: 부모-자식 계층 셋업
  const parentRes = await request.post('/api/tasks', { data: { title: '기획 회의' } });
  const parent = await parentRes.json();
  await request.post('/api/tasks', { data: { title: '아젠다 초안 작성', parentId: parent.id } });
  await page.goto('/');

  // 초기 상태: 자식 행 표시, 접기 아이콘(▼) 표시
  await expect(page.getByText('아젠다 초안 작성', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '접기' })).toBeVisible();

  // When: ▼(접기) 클릭
  await page.getByRole('button', { name: '접기' }).click();

  // Then: 아이콘이 펼치기(▶)로 변경, 자식 행 숨김
  await expect(page.getByRole('button', { name: '펼치기' })).toBeVisible();
  await expect(page.getByText('아젠다 초안 작성', { exact: true })).not.toBeVisible();

  // When: ▶(펼치기) 클릭
  await page.getByRole('button', { name: '펼치기' }).click();

  // Then: 아이콘이 접기(▼)로 복원, 자식 행 재표시
  await expect(page.getByRole('button', { name: '접기' })).toBeVisible();
  await expect(page.getByText('아젠다 초안 작성', { exact: true })).toBeVisible();
});
