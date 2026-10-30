# 그누보드7 해외 주소 입력 플러그인 (community-intl_address)

그누보드7에 **해외 주소 입력**을 더하는 플러그인입니다. 국내 주소는 Daum 우편번호로, 해외 주소는 이 플러그인으로 입력합니다.

- **국가별 입력 폼과 검증:** 국가(ISO 3166-1, 249개)마다 필수 칸, 우편번호 형식, 주·도 선택지가 바뀝니다. 미국 주, 캐나다 주, 호주 주, 일본 도도부현 등은 선택 목록으로 고릅니다.
- **주소 자동완성(선택):** Google Places, Loqate, Geoapify 중에서 고릅니다. API 키가 없으면 직접 입력만 됩니다.
- **모든 주소 화면에 붙습니다:** Daum 우편번호와 같은 확장점(`address_search_slot`)을 쓰기 때문에, 주소 검색 버튼이 있는 모든 화면에 「해외 주소」 버튼이 나란히 섭니다.
- **백엔드가 없습니다:** Daum 우편번호 플러그인과 같은 구조입니다. 라우트, 테이블, 마이그레이션이 없고, 고른 주소의 저장은 그 화면을 가진 확장(이커머스, 회원)이 맡습니다.

| 항목 | 값 |
|---|---|
| 식별자 | `community-intl_address` |
| 코어 | 그누보드7 7.1.1 이상 |
| 의존 | 없음 (이커머스 모듈이 있으면 해외 배송지와 연동) |
| 라이선스 | MIT |

## 설치

```bash
git clone https://github.com/hwaryeon1234/g7-plugin-community-intl_address plugins/_bundled/community-intl_address
```

```bash
php artisan plugin:install community-intl_address
```

```bash
php artisan plugin:activate community-intl_address
```

빌드 결과물(`dist/js/plugin.iife.js`)이 저장소에 포함되어 있어 따로 빌드할 필요가 없습니다. 소스를 고쳤다면 `npm install && npm run build` 후 `php artisan plugin:update community-intl_address --force` 로 반영합니다.

## 어디에 붙나

| 화면 | 고른 주소가 들어가는 곳 |
|---|---|
| 주문서 배송지 (`shop/checkout`) | 배송 국가와 해외 주소 칸(`address_line_1/2`, `intl_city/state/postal_code`). 배송비가 다시 계산됩니다 |
| 주문서의 배송지 관리 모달 | 같은 해외 주소 칸 |
| 마이페이지 배송지 추가·수정 | 같은 해외 주소 칸 |
| 관리자 주문 상세 수령인 정보 | `recipient_country_code`와 해외 주소 칸 |
| 회원가입·회원정보 수정·관리자 회원 폼·주문 주소 변경 등 해외 칸이 없는 화면 | 우편번호 칸에 우편번호, 주소 칸에 한 줄 주소(예: `1600 Amphitheatre Pkwy, Mountain View, CA, United States`) |

이커머스 화면에서는 **이커머스 해외배송이 켜져 있을 때만** 버튼이 보이고, 국가 목록은 이커머스 배송 가능 국가와 이 플러그인의 허용 국가가 겹치는 국가로 제한됩니다.

> **알아 둘 점:** 기본 템플릿은 주소 검색 자리를 국내(KR) 주소 칸 옆에만 둡니다. 해외 주소를 적용하면 화면이 해외 주소 칸으로 바뀌고, 그 칸은 직접 고칠 수 있습니다. 해외 주소를 다시 검색하려면 국가를 대한민국으로 바꾼 뒤 「해외 주소」를 누르세요. 템플릿이 해외 칸 옆에도 `address_search_slot` 을 열어 주면 이 과정 없이 바로 붙습니다([docs/extension-points.md](docs/extension-points.md)).

## 설정

관리자 → 플러그인 → 해외 주소 입력 → 설정

| 설정 | 기본값 | 설명 |
|---|---|---|
| 자동완성 제공자 | 사용 안 함 | `none` · `google` · `loqate` · `geoapify` |
| Google Places API 키 | (빈 값) | Places API (New) 를 사용 설정한 키 |
| Loqate API 키 | (빈 값) | Address Capture 키 |
| Geoapify API 키 | (빈 값) | 무료 요금제가 있습니다 |
| 기본 국가 | `US` | 창을 열 때 먼저 선택되는 국가 |
| 허용 국가 | (전체) | 쉼표로 구분한 국가 코드 (예: `US,JP,CN`) |
| 대한민국 제외 | 켬 | 국내 주소는 Daum 우편번호로 받도록 목록에서 뺍니다 |
| 테마 색상 | `#1D4ED8` | 입력 창 강조 색 |

### API 키 보안

자동완성은 **브라우저가 제공자에 직접 요청**합니다(서버를 거치지 않음). 그래서 키가 방문자 브라우저에 보입니다. 반드시 제공자 콘솔에서 키 사용을 사이트 도메인으로 제한하세요.

- **Google:** Cloud Console → 사용자 인증 정보 → 키 → 「웹사이트」 제한에 도메인 추가, API 제한을 「Places API (New)」로
- **Loqate:** 계정 → 키 설정 → 허용 URL(Referrer) 제한
- **Geoapify:** 프로젝트 → API 키 → Allowed origins

제공자 호출이 실패해도(키 오류, 한도 초과, 네트워크) 입력 창은 안내를 띄우고 **직접 입력으로 계속** 진행할 수 있습니다.

## 다른 확장에서 쓰기

### 1. 레이아웃 (확장점)

자기 화면에 `address_search_slot` 을 열면 버튼이 자동으로 붙습니다. 해외 칸을 가진 화면이면 `intlTarget` 으로 그 칸의 위치를 알려 줍니다.

```html
<extension-point name="address_search_slot" data-ref="my_address_slot">
  <prop name="intlTarget">
    <field name="target" value="local"/>
    <field name="prefix" value="form."/>
  </prop>
  <callback name="onAddressSelect">
    <set-state target="local" form.zipcode="{{$event.zipcode}}" form.address="{{$event.address}}"/>
  </callback>
</extension-point>
```

### 2. 레이아웃 액션 (핸들러)

```html
<action handler="community-intl_address.openIntlAddress" callbackAction="..." intlTarget="checkout" countries="{{['US','JP']}}"/>
```

### 3. 스크립트 (`window.G7IntlAddress`)

```js
G7IntlAddress.validate({ countryCode: 'US', addressLine1: '1 Main St', city: 'Austin', state: 'TX', postalCode: '7870' });
// → { postalCode: 'invalid_postal' }

G7IntlAddress.format({ countryCode: 'JP', addressLine1: '1-1 Chiyoda', city: 'Chiyoda-ku', state: 'Tokyo', postalCode: '100-0001' });
// → '1-1 Chiyoda, Chiyoda-ku, Tokyo 100-0001, Japan'

const event = await G7IntlAddress.open({ countries: ['US', 'CA'] }); // 닫으면 null
```

전체 계약(이벤트 필드, 프리셋, API)은 [docs/extension-points.md](docs/extension-points.md)를 보세요.

## 개발

```bash
npm install
```

```bash
npm run test:run
```

```bash
npm run typecheck
```

```bash
G7_BUILD_SOURCEMAP=0 npm run build
```

레이아웃 소스는 `.g7.html` 이고 짝 `.json` 은 코어 `php artisan layout:decompile <파일> --sync` 로 굽습니다.

## 라이선스

MIT — [LICENSE](LICENSE)
