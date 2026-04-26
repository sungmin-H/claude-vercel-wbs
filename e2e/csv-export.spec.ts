import { test, expect } from '@playwright/test'
import { cleanupTasks } from './helpers'

test.beforeEach(async ({ request }) => {
  await cleanupTasks(request)
  const parent = await request.post('/api/tasks', {
    data: { title: '기획', status: 'todo', progress: 0 },
  })
  const { id: parentId } = await parent.json()
  await request.post('/api/tasks', {
    data: { title: '기획 세부1', status: 'todo', progress: 0, parentId },
  })
  await request.post('/api/tasks', {
    data: { title: '기획 세부2', status: 'todo', progress: 0, parentId },
  })
})

test('J10 — CSV 내보내기', async ({ page }) => {
  await page.goto('/')
  // tasks 로딩 완료 대기
  await expect(page.getByText('기획', { exact: true })).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'CSV 내보내기' }).click(),
  ])

  expect(download.suggestedFilename()).toMatch(/^wbs-\d{4}-\d{2}-\d{2}\.csv$/)

  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const text = Buffer.concat(chunks).toString('utf-8').replace(/^﻿/, '')

  const lines = text.split('\n').filter(l => l.trim())
  expect(lines.length).toBe(4)  // 헤더 + task 3개

  // 헤더 컬럼 확인 (따옴표 제거)
  const headerCols = lines[0].split(',').map(c => c.replace(/"/g, ''))
  expect(headerCols[0]).toBe('제목')
  expect(headerCols[7]).toBe('상위 작업 제목')
  expect(headerCols[8]).toBe('상위 id')
  expect(headerCols[9]).toBe('id')

  // 자식 행에 부모 제목과 부모 ID가 채워져 있어야 함
  const childLines = lines.slice(1).filter(l => l.includes('기획 세부'))
  expect(childLines.length).toBe(2)
  for (const line of childLines) {
    const cols = line.split(',').map(c => c.replace(/"/g, ''))
    expect(cols[7]).toBe('기획')                         // 상위 작업 제목
    expect(cols[8]).toMatch(/^[0-9a-f-]{36}$/)           // 상위 id (UUID 형식)
    expect(cols[9]).toMatch(/^[0-9a-f-]{36}$/)           // id (UUID 형식)
  }
})
