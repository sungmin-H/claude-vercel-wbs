import { test, expect } from '@playwright/test'
import { cleanupTasks } from './helpers'
import path from 'path'

test.beforeEach(async ({ request }) => {
  await cleanupTasks(request)
})

test('J11 — CSV 가져오기 (정상)', async ({ page, request }) => {
  // Given: 기존 작업 2개
  await request.post('/api/tasks', { data: { title: '기존 작업 1', status: 'todo', progress: 0 } })
  await request.post('/api/tasks', { data: { title: '기존 작업 2', status: 'todo', progress: 0 } })

  await page.goto('/')

  // When: CSV 파일 업로드
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'CSV 불러오기' }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(path.join(__dirname, 'fixtures/valid.csv'))

  // Then: 미리보기 — 3개 추가, 제외 없음
  await expect(page.getByText('3개 작업 추가')).toBeVisible()
  await expect(page.getByText('제외', { exact: false }).first()).not.toBeVisible()

  // When: 적용
  await page.getByRole('button', { name: '3개 추가' }).click()

  // Then: 모달 닫힘
  await expect(page.getByText('CSV 미리보기')).not.toBeVisible()

  // Then: 모든 작업이 목록에 표시됨
  await expect(page.getByText('기존 작업 1')).toBeVisible()
  await expect(page.getByText('기존 작업 2')).toBeVisible()
  await expect(page.getByText('리서치', { exact: true })).toBeVisible()
  await expect(page.getByText('리서치 요약')).toBeVisible()
  await expect(page.getByText('리뷰 미팅')).toBeVisible()

  // Then: 리서치 요약이 리서치 하위에 있어야 함 (API 검증)
  const res = await request.get('/api/tasks')
  const taskList = await res.json()
  const parent = taskList.find((t: { title: string }) => t.title === '리서치')
  const child = taskList.find((t: { title: string }) => t.title === '리서치 요약')
  expect(parent).toBeDefined()
  expect(child).toBeDefined()
  expect(child.parentId).toBe(parent.id)
})

test('J12 — CSV 가져오기 (부분 오류)', async ({ page, request }) => {
  await page.goto('/')

  // When: 오류 포함 CSV 업로드
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'CSV 불러오기' }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(path.join(__dirname, 'fixtures/partial-error.csv'))

  // Then: 미리보기 — 2개 추가, 경고 1건, 제외 1건
  await expect(page.getByText('2개 작업 추가')).toBeVisible()
  await expect(page.getByText('경고 1건')).toBeVisible()
  await expect(page.getByText('제외 1건')).toBeVisible()
  await expect(page.getByText('상위 매칭 실패 → 최상위로 처리')).toBeVisible()

  // When: 적용
  await page.getByRole('button', { name: '2개 추가' }).click()

  // Then: 모달 닫힘
  await expect(page.getByText('CSV 미리보기')).not.toBeVisible()

  // Then: 유효한 2개만 추가됨
  await expect(page.getByText('문서화')).toBeVisible()
  await expect(page.getByText('QA')).toBeVisible()
  await expect(page.getByText('설명만 있음')).not.toBeVisible()

  // Then: API로 추가 수 검증
  const res = await request.get('/api/tasks')
  const taskList = await res.json()
  expect(taskList).toHaveLength(2)
})

test('J13 — CSV 가져오기 (upsert: ID 기반 수정 + 추가 혼합)', async ({ page, request }) => {
  // Given: '기획' 작업 사전 생성 — 실제 ID 확보
  const created = await request.post('/api/tasks', {
    data: { title: '기획', status: 'todo', progress: 0, assignee: '김PM' },
  })
  const { id: existingId } = await created.json()

  await page.goto('/')
  await expect(page.getByText('기획', { exact: true })).toBeVisible()

  // When: 실제 ID가 포함된 CSV를 동적으로 생성해 업로드
  const csvContent = [
    '제목,설명,담당자,상태,진행률,시작일,목표 기한,상위 작업 제목,상위 id,id',
    `기획,,박PM,doing,50,,,,,${ existingId}`,  // id 컬럼으로 매칭 → 수정
    '신규 작업,,이대리,todo,0,,,,,',             // id 없음 → 추가
  ].join('\n')

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'CSV 불러오기' }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles({
    name: 'upsert.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent, 'utf-8'),
  })

  // Then: 미리보기 — 추가 1 · 수정 1
  await expect(page.getByText('추가 1 · 수정 1')).toBeVisible()

  // When: 적용
  await page.getByRole('button', { name: '추가 1 · 수정 1' }).click()

  // Then: 모달 닫힘
  await expect(page.getByText('CSV 미리보기')).not.toBeVisible()

  // Then: 두 작업 모두 목록에 표시
  await expect(page.getByText('기획', { exact: true })).toBeVisible()
  await expect(page.getByText('신규 작업')).toBeVisible()

  // Then: API 검증 — tasks 총 2개, 기획 id 동일·필드 업데이트
  const res = await request.get('/api/tasks')
  const taskList = await res.json()
  expect(taskList).toHaveLength(2)

  const updated = taskList.find((t: { title: string }) => t.title === '기획')
  expect(updated).toBeDefined()
  expect(updated.id).toBe(existingId)    // id 변경 없음
  expect(updated.assignee).toBe('박PM') // 담당자 수정됨
  expect(updated.status).toBe('doing')  // 상태 수정됨
  expect(updated.progress).toBe(50)     // 진행률 수정됨
})
