# 해외 주소 입력 — 확장 계약

> 이 플러그인을 다른 화면·확장에서 쓰는 방법 · 진입점: [README.md](../README.md)

서버 훅은 없습니다. 주소 선택은 브라우저 안에서 시작해서 끝나는 흐름이라, 끼어드는 자리는 **확장점 · 핸들러 매개변수 · 스크립트 API** 세 가지입니다.

## 1. 확장점 `address_search_slot`

`resources/extensions/intl-address-search.g7.html` 이 이 확장점에 우선순위 110으로 붙습니다. Daum 우편번호(50, 100) 뒤에 섭니다.

확장점을 여는 쪽이 줄 수 있는 것:

| 이름 | 종류 | 설명 |
|---|---|---|
| `onAddressSelect` | callback | 주소를 확정하면 `$event` 로 표준 이벤트를 받아 실행합니다 (Daum 우편번호와 같은 콜백) |
| `intlTarget` | prop | 해외 칸을 쓸 대상. 프리셋 이름이나 객체를 넣습니다 (아래 3절). 주지 않으면 조각이 화면 상태를 보고 내장 프리셋을 고릅니다 |
| `countries` | prop | 이 화면이 받는 국가 코드 배열. 플러그인 설정의 허용 국가와 겹치는 국가만 보입니다 |
| `targetFields` | prop | 콜백과 `intlTarget` 이 모두 없을 때 쓸 로컬 상태 경로. `{ 이벤트필드: '상태.경로' }` |
| `disabled` | prop | `true` 면 버튼을 잠급니다 (읽기 전용 화면) |

## 2. 표준 이벤트 (`$event`)

앞의 7개는 Daum 우편번호 플러그인과 같은 이름이라, 기존 콜백을 고치지 않아도 받습니다.

| 필드 | 해외 칸이 없는 화면 | 해외 칸을 채운 화면 (`intlTarget`) |
|---|---|---|
| `zipcode` | 우편번호 (최대 10자) | `''` |
| `address` | 한 줄 주소 (우편번호 제외, 국가명 포함) | `''` |
| `addressDetail` | `''` | `''` |
| `region` | 주/도 | 주/도 |
| `city` | 도시 | 도시 |
| `countryCode` | ISO 3166-1 alpha-2 | 같음 |
| `addressLine1` · `addressLine2` | 주소 1 · 2 | 같음 |
| `state` · `postalCode` | 주/도 · 우편번호 | 같음 |
| `formatted` | 국제 우편 영문 순서 한 줄 (우편번호 포함) | 같음 |
| `provider` | `google` · `loqate` · `geoapify` · `manual` | 같음 |
| `_raw` | 제공자 원본 응답 (`manual` 이면 `null`) | 같음 |

해외 칸을 채우는 화면에서 `zipcode` · `address` 를 비우는 이유: 그 화면들은 국가를 바꿀 때 국내 칸을 비웁니다. 같은 상태를 만들어서 국내 칸에 해외 값이 남지 않게 합니다.

## 3. `intlTarget` — 해외 칸 쓰기

주소를 확정하면 핸들러가 **먼저** `intlTarget` 으로 해외 칸과 국가를 `setState` 한 뒤 **그다음** 콜백을 실행합니다. 이 순서 덕분에 주문서 콜백의 배송비 재계산(PUT `/checkout`)이 바뀐 국가로 계산됩니다.

### 내장 프리셋

| 이름 | 상태 | 접두어 | 비고 |
|---|---|---|---|
| `checkout` | local | `shipping.` | `checkout.country_code` 도 함께 씁니다 |
| `checkout_modal` | global | `checkoutAddressModal.editing.` | |
| `user_address` | global | `editingAddress.` | |
| `admin_order` | local | `form.` | 국가 칸 이름이 `recipient_country_code` |

조각은 화면 상태를 보고 프리셋을 고릅니다.

1. `_global.checkoutAddressModal.mode === 'form'` 이면 `checkout_modal`
2. `_global.editingAddress` 가 있으면 `user_address`
3. `_local.form.recipient_address` 가 있으면 `admin_order`
4. `_local.shipping` 과 `_local.checkout` 이 있으면 `checkout`
5. 모두 아니면 프리셋 없음 (콜백만 실행)

### 객체로 넘기기

```json
{
  "target": "local",
  "prefix": "form.",
  "fields": { "countryCode": "country", "postalCode": "zip" },
  "mirror": { "summary.country": "countryCode" },
  "clearDomestic": true
}
```

`fields` 를 생략하면 이커머스 칸 이름(`country_code`, `address_line_1`, `address_line_2`, `intl_city`, `intl_state`, `intl_postal_code`)을 씁니다.

## 4. 핸들러 `community-intl_address.openIntlAddress`

| 매개변수 | 설명 |
|---|---|
| `callbackAction` | 확정 후 실행할 액션 (보통 `{{extensionPointCallbacks.onAddressSelect}}`) |
| `intlTarget` | 위 3절 |
| `countries` | 허용 국가 배열 |
| `defaultCountry` | 처음 선택할 국가 (없으면 설정의 기본 국가) |
| `initial` | 미리 채울 주소 `{ countryCode, addressLine1, … }` |
| `targetFields` | 위 1절 |
| `settings` | 설정 덮어쓰기 (예: `{ provider: 'none' }`) |

## 5. 스크립트 API `window.G7IntlAddress`

| 메서드 | 설명 |
|---|---|
| `version` | API 버전 (`1`) |
| `getCountries({ allowed?, locale? })` | 국가 목록 `[{ code, name }]` (설정 반영) |
| `allCountryCodes()` | ISO 코드 전체 |
| `getFormat(code)` | 국가 형식 `{ postalRequired, postalPattern, postalExample, stateRequired, stateLabel, states, cityRequired }` |
| `validate(address)` | 오류 `{ 필드: 코드 }`. 코드는 `required` · `invalid_postal` · `invalid_country` · `too_long` |
| `normalize(address)` | 공백과 대소문자를 정리합니다 |
| `format(address, countryLocale = 'en')` | 한 줄 주소 |
| `fromEcommerce(record)` | 이커머스 칸 이름을 쓰는 객체를 플러그인 주소로 바꿉니다 |
| `open(options)` | 입력 창을 엽니다. 확정하면 표준 이벤트, 닫으면 `null` |

## 6. 자동완성 제공자 추가

`resources/js/providers/` 에 `AddressProvider` 계약(`search` · `retrieve`)을 구현하고 `providers/index.ts` 의 `factories` 에 등록합니다. `plugin.php` 설정 스키마의 `provider` 선택지와 키 필드, `config/settings/defaults.json`, 설정 화면, 번역도 함께 늘립니다.
