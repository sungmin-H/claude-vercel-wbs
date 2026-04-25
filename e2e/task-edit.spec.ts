import { test, expect } from '@playwright/test';
import { cleanupTasks } from './helpers';

test.beforeEach(async ({ request }) => {
  await cleanupTasks(request);
});

test('J5 — 진행률 100% → 상태 자동 "완료"', async ({ page, request }) => {
  await request.post('/api/tasks', { data: { title: '아젠다 초안 작성' } });
  await page.goto('/');

  await page.getByText('아젠다 초안 작성', { exact: true }).click();
  await expect(page.getByText('작업 편집')).toBeVisible();

  // React가 변경을 감지하도록 native setter + input 이벤트 방식 사용
  const slider = page.locator('input[type="range"]');
  await slider.evaluate((el: HTMLInputElement) => {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    nativeSetter.call(el, '100');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.getByText('작업 편집')).not.toBeVisible();

  // 목록에서 상태 배지 "완료" 확인
  await expect(page.getByText('완료', { exact: true })).toBeVisible();
});

test('J6 — 상태 배지 인라인 순환 전환', async ({ page, request }) => {
  await request.post('/api/tasks', { data: { title: '기획 회의' } });
  await page.goto('/');

  // 초기 상태 확인
  await expect(page.getByText('할 일', { exact: true })).toBeVisible();

  // 클릭 1: 할 일 → 진행 중
  await page.getByText('할 일', { exact: true }).click();
  await expect(page.getByText('진행 중', { exact: true })).toBeVisible();

  // 클릭 2: 진행 중 → 완료
  await page.getByText('진행 중', { exact: true }).click();
  await expect(page.getByText('완료', { exact: true })).toBeVisible();

  // 클릭 3: 완료 → 할 일
  await page.getByText('완료', { exact: true }).click();
  await expect(page.getByText('할 일', { exact: true })).toBeVisible();

  // 새로고침 후에도 마지막 상태(할 일) 유지
  await page.reload();
  await expect(page.getByText('할 일', { exact: true })).toBeVisible();
});

test('J7 — 작업 제목 수정', async ({ page, request }) => {
  await request.post('/api/tasks', { data: { title: '기획 회의' } });
  await page.goto('/');

  await page.getByText('기획 회의', { exact: true }).click();
  await expect(page.getByText('작업 편집')).toBeVisible();

  const titleInput = page.getByLabel('제목');
  await titleInput.clear();
  await titleInput.fill('킥오프 미팅');
  await page.getByRole('button', { name: '저장' }).click();

  await expect(page.getByText('킥오프 미팅', { exact: true })).toBeVisible();
  await expect(page.getByText('기획 회의', { exact: true })).not.toBeVisible();
});

test('편집 모달 — 목표 기한이 시작일보다 앞이면 저장 실패', async ({ page, request }) => {
  await request.post('/api/tasks', { data: { title: '테스트 작업' } });
  await page.goto('/');

  await page.getByText('테스트 작업', { exact: true }).click();
  await expect(page.getByText('작업 편집')).toBeVisible();

  await page.getByLabel('시작일').fill('2026-05-10');
  await page.getByLabel('목표 기한').fill('2026-05-05');
  await page.getByRole('button', { name: '저장' }).click();

  // 모달 유지, 에러 메시지 표시
  await expect(page.getByText('작업 편집')).toBeVisible();
  await expect(page.getByText('목표 기한은 시작일 이후여야 합니다')).toBeVisible();
});
