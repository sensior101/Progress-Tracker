---
name: progress-tracker
description: 프로젝트 진행 상황을 체크하는 HTML 페이지를 만들거나 갱신할 때 사용. "진행 체크 페이지", "진행 상황 html", "체크리스트 만들어줘", "progress tracker" 같은 요청에 트리거.
---

# Progress Tracker

이 스킬 폴더의 `template.html`을 그대로 복사해서, **`<script id="data" type="application/json">` 블록만** 프로젝트에 맞게 채운다. 디자인, CSS, JS는 수정하지 않는다.

## 순서

1. 프로젝트를 파악한다: `README.md`, `docs/`, 빌드 파일, 최근 git log, 기존 TODO 등을 읽는다.
2. 작업을 3~7개 단계(phase)로 나누고, 단계마다 구체적인 할 일(task)을 뽑는다.
   - task는 한 줄로, 완료 여부를 판단할 수 있는 표현으로 쓴다 ("로그인 화면 구현" O, "로그인 관련" X).
   - 코드에서 이미 끝난 것이 확인되면 `"done": true`.
   - 부연 설명이 필요하면 `"note"`를 쓴다.
3. 출력 위치: 사용자가 따로 말하지 않으면 프로젝트 루트의 `docs/progress.html`.
4. 이미 `docs/progress.html`이 있으면 새로 만들지 말고 data 블록만 갱신한다.
   - 기존 task의 `id`는 절대 바꾸지 않는다 (브라우저에 저장된 체크 상태가 id 기준이라서).
   - 새 task는 새 id로 추가하고, `updated`를 오늘 날짜로 바꾼다.

## data 형식

```json
{
  "project": "프로젝트 이름",
  "subtitle": "한 줄 설명",
  "updated": "YYYY-MM-DD",
  "phases": [
    {
      "title": "1. 단계 이름",
      "description": "선택",
      "tasks": [
        { "id": "고유-id", "text": "할 일", "done": false, "note": "선택" }
      ]
    }
  ]
}
```

- `id`는 페이지 안에서 고유한 짧은 kebab-case (`setup-1`, `ui-login` 등).
- `project` 값이 localStorage 키로 쓰이므로 프로젝트마다 다르게, 한 번 정하면 유지한다.
- JSON 안의 문자열에 `</script>`가 들어가지 않게 한다.
