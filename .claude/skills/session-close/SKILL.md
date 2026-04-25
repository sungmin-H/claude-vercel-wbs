---
name: session-close
description: 세션 종료 전 마무리 작업을 수행합니다. E2E 테스트 실행 + 스크린샷 촬영 → PR 코멘트 → 머지 → 관련 이슈 닫기 → 메모리 업데이트 순으로 진행합니다. 수강생이 "세션 종료", "마무리해줘", "마무리 작업" 등을 요청할 때 이 스킬을 호출합니다.
---

# session-close

세션을 깔끔하게 마무리하는 스킬. 이 세션에서 완료된 작업을 GitHub에 반영하고, 다음 세션을 위한 상태를 정리한다.

## 절차

### 1. 미커밋 변경사항 확인

```bash
git status
git diff --stat
```

- 커밋되지 않은 변경이 있으면 수강생에게 알리고 커밋 여부를 확인한다.
- 커밋 대상: 구현 코드, 테스트 스펙, 스키마 파일. **절대 커밋 안 함**: `.env.local`, `supabase/.temp/`

### 2. E2E 테스트 실행 + 화면 스크린샷

두 작업을 한 단계로 진행한다.

#### 2-1. E2E 테스트 실행

```bash
npm run test:e2e
```

- **모두 통과** → 결과 표를 메모하고 2-2로 이동.
- **실패** 시:
  - 실패 원인을 분석한다 (UI 변경에 의한 로케이터 불일치 vs 실제 기능 버그).
  - UI 변경에 의한 것이면 테스트 스펙을 수정하고 재실행.
  - 실제 버그면 수강생에게 보고 후 수정 여부를 결정한다.

#### 2-2. 스크린샷 촬영 (Playwright MCP)

테스트 통과 직후 Playwright MCP로 `http://localhost:3000` 을 열어 주요 화면을 캡처한다.

촬영 순서:
1. **빈 상태 화면** — 모든 작업 삭제(또는 beforeEach cleanup 상태) 후 `/` 접속
2. **작업 목록 화면** — 작업이 1개 이상 있는 상태의 메인 페이지

```
mcp__playwright__browser_navigate  → http://localhost:3000
mcp__playwright__browser_take_screenshot  → 파일로 저장
```

캡처된 이미지는 3단계 PR 코멘트에 포함한다.

### 3. PR에 E2E 결과 + 스크린샷 코멘트 남기기

현재 오픈된 PR 번호를 확인 후 코멘트를 작성한다:

```bash
gh pr comment <PR번호> --repo <owner/repo> --body "..."
```

코멘트 형식:

```markdown
## ✅ E2E 테스트 결과 (로컬 검증)

| 테스트 파일 | 시나리오 | 결과 |
|---|---|---|
| `e2e/task-list.spec.ts` | J1 — 빈 상태 화면 | ✅ PASS |
| `e2e/task-create.spec.ts` | J2 — 최상위 작업 추가 | ✅ PASS |
| `e2e/task-create.spec.ts` | J17 — 목표 기한 유효성 검사 | ✅ PASS |
| `e2e/task-delete.spec.ts` | J8 — 하위 포함 삭제 | ✅ PASS |

**N passed, 0 failed — Xs**

---

## 📸 화면 스크린샷

### 빈 상태
![빈 상태](이미지_URL)

### 작업 목록
![작업 목록](이미지_URL)
```

> **이미지 첨부 방법**: 스크린샷 파일을 GitHub PR 코멘트 입력창에 드래그&드롭하면 자동으로 URL이 생성된다. 생성된 URL을 코멘트 본문에 삽입하거나, 수강생에게 이 방법을 안내한다.

### 4. PR 머지

```bash
gh pr merge <PR번호> --repo <owner/repo> --merge --delete-branch
```

- `--delete-branch`: 머지 후 브랜치 자동 삭제.
- 머지 후 `gh pr view <PR번호> --json state,mergedAt` 로 성공 확인.
- 머지 완료 후 GitHub Actions `db-migrate` 워크플로우가 자동 실행된다. 수강생에게 Actions 탭 확인을 안내한다.

### 5. 관련 이슈 닫기

```bash
gh issue list --repo <owner/repo>  # 열린 이슈 목록 확인
gh issue close <번호> --repo <owner/repo> --comment "PR #<번호> 머지 완료."
```

닫을 이슈 범위:
- **상위 이슈** (예: #3 Task 생성/목록/삭제)
- **하위 이슈** (예: [3-1] ~ [3-4] TDD 단계 이슈)
- **이전 미닫힘 이슈** — 코드가 이미 반영됐지만 이슈가 열려있는 경우 함께 닫는다

### 6. 메모리 업데이트

세션에서 완료된 사항과 다음 작업 상태를 메모리에 기록한다.

업데이트 대상:
- `project_wbs_*.md` — 완료된 이슈, 다음 이슈 상태
- `feedback_*.md` — 세션에서 반복 수정이 필요했던 패턴 기록

### 7. 마무리 보고

수강생에게 다음 형식으로 정리해서 보여준다:

```
## 이번 세션 완료 사항
- ✅ 이슈 #N: 제목
- ✅ PR #N 머지 (feat/xxx → main)
- ✅ 이슈 #N, #N, #N 닫힘

## 다음 세션에서 할 일
- 이슈 #N: 다음 기능 제목

## 주의사항
- GitHub Actions db-migrate 워크플로우 성공 여부 확인 필요
- (있다면) 미처 해결 못한 사항
```

## 규칙

- 이슈를 닫기 전에 반드시 PR이 머지됐는지 확인한다.
- 테스트가 실패한 상태로 PR을 머지하지 않는다 — 원인을 파악하고 수정하거나 수강생의 명시적 동의를 받는다.
- 스크린샷은 E2E 테스트와 같은 단계(2단계)에서 Playwright MCP로 직접 촬영하고 PR 코멘트에 포함한다.
- 커밋 없이 닫을 이슈가 있으면 수강생에게 어떤 커밋/PR이 처리했는지 설명한다.
- 한국어로 대화한다.
