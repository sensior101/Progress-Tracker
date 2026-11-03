# Progress Tracker

프로젝트 코드를 분석해 업무 JSON을 만드는 AI 스킬과, 진행 상황·일정·포인트를 관리하는 공용 사이트.

**[공용 사이트 열기](https://sensior-progress-tracker.pages.dev)**

## 사용하는 순서

1. 프로젝트에서 스킬에 **“프로젝트 분석해서 진행 업무 JSON 만들어줘”**라고 요청합니다.
2. 생성된 `docs/progress.json`을 확인합니다.
3. 공용 사이트에서 GitHub 로그인 후 **JSON 가져오기**로 등록합니다.
4. 사이트에서 업무 체크·일정 등록·상세 설명 확인·테마 구매를 합니다.

프로젝트마다 HTML을 복사하거나 로컬 파일에서 진행 상태를 관리하지 않습니다. 스킬은 JSON만 생성·갱신하고, 실제 상태와 지갑은 로그인한 계정에 저장합니다. 다른 PC에서도 같은 계정으로 이어서 사용할 수 있습니다.

## 주요 기능

- 단계별 격자 보드, 완료·미완료 필터와 다음 할 일
- 업무 제목을 누르면 상세 설명 팝업 표시, X·Esc로 닫기
- 캘린더 날짜 등록·변경·해제, 완료 체크 시 한국 시간 기준 완료 날짜 자동 등록
- 전체 완료 시 축하 팝업과 컨페티
- 프로젝트 최초 100% 완료 시 트로피 자동 획득. 진열장에 프로젝트 이름과 한국 시간 기준 완료 날짜 표시
- 트로피 모양은 프로젝트별로 변경할 수 있습니다. 기본 모양은 무료이고 추가 디자인 19종은 각 200P입니다.
- 진열장 기본 테마는 무료입니다. 철제 선반·아케이드·박물관·월넛 선반은 각 100P, 우주 관측소는 500P입니다. 상점에서 미리 보고 보유한 테마를 진열장에서 선택합니다.
- 업무당 최초 완료 **10P**, 중복 지급 방지
- 테마 미리보기·구매·적용: 기본 라임은 무료, 핑크·빨강·오렌지·파랑은 각 **100P**
- 계정별 프로젝트·일정·포인트·구매 테마 저장

## 스킬 설치

```powershell
git clone https://github.com/sensior101/Progress-Tracker.git "$HOME\progress-tracker"
New-Item -ItemType Directory -Force -Path "$HOME\.claude\skills"
New-Item -ItemType Junction -Path "$HOME\.claude\skills\progress-tracker" -Target "$HOME\progress-tracker\progress-tracker"
```

연결 명령은 같은 이름의 스킬 폴더가 아직 없을 때 사용합니다. 이후 프로젝트에서 다음처럼 요청합니다.

> 현재 코드를 분석해서 docs/progress.json 만들어줘. 업무마다 목적, 작업 순서, 완료 기준을 자세히 적어줘.

업데이트할 때:

> 현재 코드 기준으로 진행 JSON 갱신해줘. 기존 프로젝트 ID와 업무 ID는 유지해줘.

스킬 원본은 저장소에서 `git pull`로 갱신합니다. 생성한 JSON은 공용 사이트에서 다시 가져오면 됩니다.

## JSON과 업데이트

데이터 형식과 작성 기준은 [SKILL.md](progress-tracker/SKILL.md)에 있습니다.

| 항목 | 용도 |
| --- | --- |
| `projectId` | 프로젝트의 고정 ID. 이름이 바뀌어도 유지합니다. |
| `project`, `subtitle`, `updated` | 이름, 설명, 데이터 갱신일 |
| `phases` | 단계와 업무 목록 |
| 업무의 `id`, `text` | 고유 업무 ID와 제목 |
| `done`, `date` | 최초 등록 시의 완료 상태와 선택 일정 |
| `note`, `details` | 짧은 요약과 목적·진행 순서·완료 기준을 담은 상세 설명 |

같은 프로젝트를 다시 가져오면 단계·설명을 갱신하고 같은 업무 ID의 서버 체크·일정을 유지합니다. 삭제된 업무는 목록에서 제거하며, 이미 지급된 보상은 다시 지급하지 않습니다. 프로젝트 이름만 바꾸고 ID를 유지하면 같은 프로젝트로 연결됩니다.

이전에 생성한 HTML은 기존 파일의 data JSON을 추출해 JSON으로 옮길 수 있습니다. 사이트의 이전 HTML 가져오기 호환성은 유지하지만, 새 프로젝트에는 JSON만 생성합니다. 과거 브라우저에만 저장한 체크·날짜·지갑은 자동 이전되지 않습니다.

## 저장소 구성

```text
progress-tracker/
└── SKILL.md           # 프로젝트 분석과 업무 JSON 생성·갱신 규칙
server/
├── app.html           # 공용 사이트의 단일 화면
├── src/worker.mjs     # 로그인·프로젝트·포인트·구매 API
├── migrations/        # Cloudflare D1 테이블과 보상 정책
├── functions/         # Pages Functions 진입점
├── tests/             # API·화면·실행 검증
└── README.md          # 서버 설정과 배포 방법
```

[서버 운영·개발 안내](server/README.md)를 참고하세요. Cloudflare Pages·Functions·D1을 사용하며 Supabase는 사용하지 않습니다. 무료 플랜 한도 내에서 운영합니다. 로컬 개발 서버는 사이트 개발·검증용이며 별도 사용자 저장 모드는 없습니다.
