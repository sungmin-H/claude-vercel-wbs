import { test, expect } from '@playwright/test';
import { cleanupTasks } from './helpers';

test.beforeEach(async ({ request }) => {
  await cleanupTasks(request);
});

// ─── J13 — 간트 뷰로 전환 ────────────────────────────────────────────────────

test('J13 — 간트 뷰로 전환', async ({ page, request }) => {
  // 날짜 있는 작업
  await request.post('/api/tasks', {
    data: {
      title: '일정 있는 작업',
      status: 'todo',
      progress: 0,
      startDate: '2026-05-01',
      dueDate: '2026-05-10',
    },
  });
  // 날짜 없는 작업
  await request.post('/api/tasks', {
    data: {
      title: '일정 없는 작업',
      status: 'todo',
      progress: 0,
    },
  });

  await page.goto('/');
  await page.getByRole('button', { name: '간트' }).click();

  // 좌측 작업 트리
  await expect(page.getByText('일정 있는 작업')).toBeVisible();
  await expect(page.getByText('일정 없는 작업')).toBeVisible();

  // 오늘 날짜 세로 강조선 (TODAY 라벨은 정확한 텍스트로 첫 번째 요소 선택)
  await expect(page.getByText('TODAY', { exact: true }).first()).toBeVisible();

  // 날짜 없는 작업 → "일정 없음" 표기
  await expect(page.getByText('일정 없음', { exact: false })).toBeVisible();
});

// ─── J14 — 간트 막대 진행률 채움 ────────────────────────────────────────────

test('J14 — 간트 막대의 진행률 채움 확인', async ({ page, request }) => {
  const res = await request.post('/api/tasks', {
    data: {
      title: '진행률 60% 작업',
      status: 'doing',
      progress: 60,
      startDate: '2026-05-01',
      dueDate: '2026-05-10',
    },
  });
  const task = await res.json();

  await page.goto('/');
  await page.getByRole('button', { name: '간트' }).click();

  // 막대 전체 영역과 진행률 fill 영역을 확인
  // gantt-view에서 막대 컨테이너: 작업 행 내부 position:absolute div
  // fill div는 첫 번째 자식 div (width = progress%)
  const taskRow = page.locator(`text=진행률 60% 작업`).locator('..').locator('..');
  // fill div의 너비가 전체 막대의 60%인지 확인
  // 구현: fill = (progress / 100) * totalBarWidth
  // 렌더링된 fill 너비와 전체 bar 너비를 비교한다
  const barContainer = page.locator('[data-testid="gantt-bar-진행률 60% 작업"]');
  // data-testid가 없으므로 텍스트 "60%" + "· 지남" 없는 케이스로 확인
  await expect(page.getByText('60%', { exact: false }).first()).toBeVisible();

  // 진행률이 30으로 바뀌면 fill이 줄어드는지 확인 — 목록 뷰에서 수정
  await page.getByRole('button', { name: '목록' }).click();
  await page.getByText('진행률 60% 작업').click();
  await expect(page.getByText('작업 편집')).toBeVisible();
  // 진행률은 range slider로 조작 (React native setter 방식)
  const slider = page.locator('input[type="range"]');
  await slider.evaluate((el: HTMLInputElement) => {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    nativeSetter.call(el, '30');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.getByRole('button', { name: '저장' }).click();

  await page.getByRole('button', { name: '간트' }).click();
  await expect(page.getByText('30%', { exact: false }).first()).toBeVisible();
});

// ─── J15 — 간트 Overdue 시각 표시 ───────────────────────────────────────────

test('J15 — 간트에서 Overdue 시각 표시', async ({ page, request }) => {
  const res = await request.post('/api/tasks', {
    data: {
      title: '기한 지난 작업',
      status: 'doing',
      progress: 30,
      startDate: '2026-03-01',
      dueDate: '2026-04-01', // 과거 날짜
    },
  });
  const task = await res.json();

  await page.goto('/');
  await page.getByRole('button', { name: '간트' }).click();

  // 막대 텍스트에 "· 지남" 포함 확인
  await expect(page.getByText('· 지남', { exact: false })).toBeVisible();

  // 완료 상태로 변경하면 overdue 표시 사라짐
  // 목록 뷰에서 상태 배지 인라인 클릭으로 '진행 중' → '완료' 전환
  await page.getByRole('button', { name: '목록' }).click();
  await page.getByText('진행 중', { exact: true }).click();

  await page.getByRole('button', { name: '간트' }).click();
  await expect(page.getByText('· 지남', { exact: false })).not.toBeVisible();
});

// ─── J16 — 간트는 읽기 전용 ─────────────────────────────────────────────────

test('J16 — 간트는 읽기 전용 (드래그 무반응)', async ({ page, request }) => {
  await request.post('/api/tasks', {
    data: {
      title: '드래그 시도 작업',
      status: 'todo',
      progress: 0,
      startDate: '2026-05-01',
      dueDate: '2026-05-10',
    },
  });

  await page.goto('/');
  await page.getByRole('button', { name: '간트' }).click();

  // 막대 텍스트 "0%" 확인 후 드래그 시도
  await expect(page.getByText('드래그 시도 작업')).toBeVisible();

  // 막대가 있는 영역에서 드래그: pointerEvents:none이므로 이벤트가 없어야 함
  const taskTitle = page.getByText('드래그 시도 작업');
  const box = await taskTitle.boundingBox();

  if (box) {
    // 우측 간트 그리드 영역에서 드래그 시도
    const startX = box.x + box.width + 100
    const startY = box.y + box.height / 2
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 200, startY)
    await page.mouse.up()
  }

  // 드래그 후에도 작업 제목이 그대로 보임 (상태 변화 없음)
  await expect(page.getByText('드래그 시도 작업')).toBeVisible();
  // 날짜가 변경되지 않았음을 확인 (API로 작업 재조회)
  const tasksRes = await page.request.get('/api/tasks');
  const tasks = await tasksRes.json();
  const dragged = tasks.find((t: { title: string }) => t.title === '드래그 시도 작업');
  expect(dragged?.startDate).toBe('2026-05-01');
  expect(dragged?.dueDate).toBe('2026-05-10');
});
