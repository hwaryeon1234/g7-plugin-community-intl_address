# 그누보드7 해외 주소 입력 플러그인 — 에이전트 가이드

> 이 플러그인을 고치는 에이전트·개발자용입니다. 사용법은 [README.md](README.md), 확장 계약은 [docs/extension-points.md](docs/extension-points.md)를 보세요.

## 요약

```text
1. 유형: 플러그인 (community-intl_address) — 해외 주소 입력·검증·자동완성. 백엔드 없음 (Daum 우편번호와 같은 구조)
2. 확장 방식: address_search_slot 조각 + openIntlAddress 핸들러 + window.G7IntlAddress
3. 건드리면 안 되는 것: 표준 이벤트 필드 이름(Daum 과 공유), 프리셋 상태 경로(이커머스 레이아웃과 맞물림)
4. 작업 위치: plugins/_bundled/community-intl_address — 활성 디렉토리 직접 수정 금지
5. 반영: npm run build → php artisan plugin:update community-intl_address --force
```

## 디렉토리

| 경로 | 역할 |
|---|---|
| `plugin.json` | manifest (버전의 기준) — 버전을 바꾸면 package.json·composer.json·CHANGELOG 도 함께 |
| `plugin.php` | 설정 스키마 (defaults.json · 설정 화면과 키가 같아야 함 — layouts.test.ts 가 잠금) |
| `resources/extensions/` | address_search_slot 조각 (`.g7.html` 소스 + 구운 `.json`) |
| `resources/layouts/admin/` | 설정 화면 |
| `resources/js/core/` | 국가 형식 · 검증 · 표기 · 프리셋 · G7Core 접근 |
| `resources/js/providers/` | 자동완성 제공자 (Google · Loqate · Geoapify) |
| `resources/js/ui/dialog.ts` | 입력 창 (DOM 직접 렌더링, `g7ia-` 접두 스타일) |
| `resources/js/handlers/` | ActionDispatcher 핸들러 |
| `resources/js/api.ts` | 공개 스크립트 API |
| `dist/` | 커밋되는 빌드 산출물 (`G7_BUILD_SOURCEMAP=0 npm run build`) |

## 핵심 흐름

버튼 클릭 → `openIntlAddress` → 국가 목록 결정(설정 허용 국가 ∩ 화면 국가, KR 제외) → 입력 창 → 확정 →
`intlTarget` 이 있으면 해외 칸 setState → `callbackAction` 실행(없으면 `targetFields`).

## 검증

- `npm run test:run` · `npm run typecheck`
- 레이아웃: 코어에서 `php artisan layout:decompile plugins/_bundled/community-intl_address/<파일>.g7.html --sync`
