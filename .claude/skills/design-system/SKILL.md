---
name: design-system
description: WBS 앱 UI 작업 전 디자인 시스템을 로드하는 스킬. 새 화면·컴포넌트·UI 변경 요청이 들어올 때마다 이 스킬을 먼저 실행해 원본 디자인 파일과 기존 구현을 참조한 뒤 작업한다.
---

# design-system

새 UI를 만들거나 기존 UI를 변경하기 전에 이 스킬을 실행한다.
**원본 디자인 파일 → 기존 구현 컴포넌트** 순서로 읽고, 그 언어를 그대로 따른다.

---

## 절차

### 1단계 — 원본 디자인 파일 읽기

`WBS Design Standalone.html` 을 읽는다. 이 파일이 이 프로젝트의 **시각 언어 원본**이다.

```
Read: WBS Design Standalone.html
```

파일을 읽은 뒤 다음을 파악한다.
- 요청된 작업과 관련된 화면이 디자인 파일에 있는가?
- 사용된 색상·간격·폰트 크기·보더 스타일은 무엇인가?
- 레이아웃 구조(그리드·플렉스·모달 등)는 어떻게 구성되어 있는가?

### 2단계 — 기존 구현 컴포넌트 확인

디자인 파일을 읽은 뒤, 아래 컴포넌트 중 요청 작업과 관련된 파일을 읽어 **이미 구현된 패턴**을 확인한다.

| 파일 | 담당 영역 |
|---|---|
| `components/task-row.tsx` | 테이블 행, 상태 배지, 진행 바, 아바타, 오버뷰 배지, 행 메뉴 |
| `components/task-list.tsx` | 테이블 헤더, 통계 바, 빈 상태 |
| `components/app-header.tsx` | 헤더, 뷰 전환 토글, 액션 버튼 |
| `components/task-create-modal.tsx` | 생성 모달 구조, 필드 레이블, 입력 스타일 |
| `components/task-edit-modal.tsx` | 편집 모달 구조, 토글 버튼 그룹 |
| `components/task-delete-dialog.tsx` | 확인 다이얼로그 패턴 |
| `components/deliverables-ui.tsx` | 타입 배지, 상태 점, 리스트 아이템 |
| `components/gantt-view.tsx` | 간트 그리드, 오늘 선, 막대, 범례 |
| `components/csv-import-modal.tsx` | 미리보기 모달, 상태 필 배지 |
| `app/globals.css` | CSS 변수(`--c-accent`, `--c-accent-soft`), 폰트, 스크롤바 |

### 3단계 — 작업 시작

1, 2단계에서 얻은 정보를 바탕으로 작업한다. 다음 규칙을 지킨다.

**색상**
- 강조색은 반드시 `var(--c-accent)` / `var(--c-accent-soft)` 사용. `#2563EB` 하드코딩 금지.
- 팔레트 외 색상을 추가해야 한다면 사용자에게 먼저 확인한다.

**컴포넌트 재사용**
- 비슷한 요소가 기존 컴포넌트에 이미 있으면 그대로 가져와 파라미터화한다.
- 새 스타일을 발명하지 않는다.

**UI 라이브러리**
- **Chakra UI v3만** 사용. Tailwind, shadcn, MUI 등 혼용 금지.
- 레이아웃 속성(display·flex·grid 등)은 Chakra prop, 세부 스타일(fontSize·color·border 등)은 `style={{}}` 객체 — 기존 코드 패턴 그대로.

**모달**
- 반드시 Chakra `<Portal>`로 렌더링. z-index 100 기준.

**텍스트**
- 한국어 UI 레이블은 영문 부제와 함께 표기. 예: `제목 · Title`, `담당자 · Assignee`.

**파일 컨벤션**
- 컴포넌트 파일명 `kebab-case.tsx`, 컴포넌트명 `PascalCase`.

---

## 언제 이 스킬을 호출하나

다음과 같은 요청이 들어오면 작업 시작 전 이 스킬을 실행한다.

- "새 화면 만들어줘 / 페이지 추가해줘"
- "새 컴포넌트 만들어줘"
- "UI 바꿔줘 / 디자인 수정해줘"
- "모달 추가해줘 / 다이얼로그 만들어줘"
- 기타 시각적 변경이 수반되는 모든 작업
