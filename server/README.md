# Cloudflare 공용 계정 서버

- 사이트: https://sensior-progress-tracker.pages.dev
- 구성: Cloudflare Pages + Pages Functions + D1. Supabase는 사용하지 않습니다.
- 서버·D1 스키마 배포와 GitHub OAuth Client ID·Secret 설정을 완료했습니다. 실제 사이트의 `loginReady: true`와 GitHub 인증 화면으로의 이동을 확인했습니다. 사용자 계정의 로그인 완료와 실사용 흐름은 별도 확인이 필요합니다.
- 유료 요금제나 유료 부가 기능으로 전환하지 않았습니다. 무료 한도와 정책은 Cloudflare의 현재 요금제를 따릅니다.

## GitHub 로그인 연결 — 최초 한 번

1. [GitHub OAuth 앱 등록](https://github.com/settings/applications/new)을 엽니다.
2. 다음 값으로 등록합니다. 저장소 권한은 요청하지 않으며 공개 계정 식별 정보만 사용합니다.

   - Application name: `Progress Tracker`
   - Homepage URL: `https://sensior-progress-tracker.pages.dev`
   - Authorization callback URL: `https://sensior-progress-tracker.pages.dev/auth/callback`

3. 앱의 Client ID를 복사하고 Client Secret을 생성합니다.
4. 이 디렉터리에서 `node configure-auth.mjs <Client-ID>`를 실행합니다.
5. Wrangler 입력창에 Client Secret을 입력합니다. 비밀키를 채팅이나 소스 파일에 붙여넣지 않습니다.

스크립트는 공개 Client ID를 설정 파일에 기록하고, Secret은 Cloudflare의 암호화된 환경 변수로 저장한 뒤 재배포합니다. 마지막에 서버의 로그인 준비 상태를 확인합니다. 계정에 로그인한 실제 브라우저에서 로그인 흐름을 별도로 확인해야 합니다.

## 사용

1. 사이트에서 GitHub 계정으로 로그인합니다.
2. **JSON 가져오기**로 스킬이 만든 업무 JSON을 등록합니다.
3. 프로젝트를 선택해 업무 체크·날짜 등록을 합니다. 상태는 서버에 저장됩니다.
4. 업무 하나를 완료할 때마다 **10P를 최초 한 번** 지급합니다. 완료 체크 시 한국 시간 기준 오늘 날짜에 자동 등록됩니다.
5. 상점에서 테마를 구매하면 같은 계정의 모든 프로젝트에서 사용할 수 있습니다.

다른 PC에서도 같은 계정으로 로그인하면 프로젝트·날짜·포인트·구매 테마를 불러올 수 있습니다. 이전 버전 HTML의 브라우저 지갑 잔액과 구매 내역은 서버로 자동 이전하지 않습니다. 개인 체크리스트의 완료 여부를 기준으로 지급하며 실제 코드 구현 완료 여부를 외부에서 인증하는 서비스는 아닙니다.

### 프로젝트 업데이트

- 데이터의 선택 항목 `projectId`를 한 번 지정하고 유지하면 이름을 바꿔도 같은 프로젝트로 연결됩니다. 없으면 프로젝트 이름을 기준으로 식별하므로 이름을 유지합니다.
- 같은 프로젝트를 다시 가져오면 단계·업무 정의를 갱신하고, 같은 업무 ID의 서버 체크·날짜는 유지합니다. 삭제된 업무는 목록에서 제거합니다.
- 프로젝트를 다시 가져오거나 업무 체크를 초기화해도 같은 업무 ID의 보상은 중복 지급되지 않습니다. 삭제했다 다시 추가해도 동일합니다. 과거 프로젝트 단위로 지급한 포인트와 구매한 테마는 유지합니다.
- 기본 무료 원고지 테마와 네 가지 유료 사이트 테마(레트로 데스크톱·블루프린트 랩·영수증·칠판 교실, 각 200P)를 제공합니다. 색상만 바꾸던 핑크·빨강·오렌지·파랑은 판매를 중단했고, 마이그레이션 0019가 구매자에게 실제 지불한 포인트를 환불하고 기본 테마로 되돌립니다. 레트로 데스크톱은 강조색뿐 아니라 전체 창·버튼·업무 목록·진행 막대의 형태를 변경합니다.
- 프로젝트 완료 트로피를 진열할 수 있습니다. 추가 트로피 디자인은 각 200P입니다. 추가 진열장 테마는 각 100P이며 우주 관측소는 500P입니다.

## 파일 책임

| 파일 | 역할 |
| --- | --- |
| `src/worker.mjs` | GitHub 로그인, 세션, 프로젝트 API, 공용 지갑 API |
| `migrations/0002_task_rewards.sql` | 업무별 10P 전환·테마 1,000P·기존 보상 보존 |
| `migrations/0001_wallet.sql` | 초기 테이블·제약·지급/차감 트리거·포인트 기록 |
| `functions/[[route]].js` | Pages Functions에서 기존 API 진입점 연결 |
| `build.mjs` | app.html로 사이트 화면 빌드 |
| `configure-auth.mjs` | 비밀키를 저장하지 않는 최초 로그인 설정·재배포 |
| `tests/` | SQLite API 테스트와 로컬 Cloudflare 런타임 검증 |

화면·체크리스트·상점은 `app.html` 한 곳에서 구현합니다. 스킬은 업무 JSON만 만들며 프로젝트마다 HTML이나 브라우저 지갑을 복사하지 않습니다.

## 검증·로컬 실행

```powershell
npm ci
npm test
npm run build
npm run db:local
npm run dev
```

서버가 실행 중일 때 별도 터미널에서 `node tests/runtime-smoke.mjs`를 실행하면 로컬 D1에만 테스트 계정을 만들고 API를 검증한 뒤 정리합니다. OAuth는 별도의 GitHub 테스트 앱과 `.dev.vars` 설정이 필요합니다.

## 배포

이미 만들어진 D1과 Pages를 재사용합니다. DB ID는 비밀키가 아닙니다.

```powershell
npx wrangler login
npm run db:remote
npm run deploy
```

Pages URL을 변경하면 `wrangler.toml`의 `PUBLIC_ORIGIN`과 GitHub 앱의 callback URL도 함께 바꿉니다. 이 저장소를 다른 사람이 설치할 때에는 자신의 Cloudflare Pages/D1을 만들고 프로젝트 이름·DB ID·URL을 변경해야 합니다.

## 권한·데이터 흐름

- GitHub OAuth state·PKCE와 일주일짜리 HttpOnly·Secure 세션 쿠키를 사용합니다. GitHub 액세스 토큰과 비밀번호는 DB에 저장하지 않습니다.
- 모든 업무·날짜·지갑 요청은 세션 사용자 기준으로 제한하며, 쓰기는 같은 출처에서만 받습니다.
- 완료 체크 → D1 트랜잭션 → 한국 시간 기준 완료 날짜 등록 → 업무별 보상 고유 제약 확인 → 10P 지급 → 지갑·날짜 반환.
- 테마 구매 → 서버 가격 확인 → D1 트랜잭션 → 잔액 검사·차감·소유 기록·선택 테마 저장 → 지갑 반환.
- 잔액·보상액·상품 가격을 클라이언트가 지정할 수 없습니다. 저장 실패 시 해당 트랜잭션은 롤백됩니다.

블루프린트 랩(100P)은 청사진 격자, 도면 카드, 검수 체크와 눈금형 진행 막대를 사이트 전체에 적용합니다. 기존 상점의 미리보기·구매·계정 저장 흐름을 사용합니다.

- 레트로 데스크톱·블루프린트 랩 테마는 각각 200P입니다.

- 레트로 데스크톱·블루프린트 랩 테마는 각각 200P입니다.
