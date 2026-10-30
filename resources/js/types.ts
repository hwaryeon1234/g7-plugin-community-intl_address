/**
 * community-intl_address 플러그인 타입 정의
 */

/**
 * 액션 컨텍스트 인터페이스
 *
 * ActionDispatcher 가 핸들러 실행 시 전달하는 컨텍스트입니다.
 */
export interface ActionContext {
    /** 버튼 클릭 시점의 컴포넌트 로컬 상태 */
    state?: Record<string, any>;
    /** 컴포넌트 로컬 상태 갱신 */
    setState?: (updates: Record<string, any>) => void;
    /** 데이터 컨텍스트 */
    data?: Record<string, any>;
    /** 격리 컨텍스트 */
    isolatedContext?: unknown;
    [key: string]: any;
}

/**
 * 플러그인이 다루는 해외 주소 (플러그인 내부 표준 형식)
 */
export interface IntlAddress {
    /** 국가 코드 (ISO 3166-1 alpha-2, 대문자) */
    countryCode: string;
    /** 주소 1 (번지·거리) */
    addressLine1: string;
    /** 주소 2 (아파트·호수·건물) */
    addressLine2: string;
    /** 도시 */
    city: string;
    /** 주/도/현 */
    state: string;
    /** 우편번호 */
    postalCode: string;
}

/**
 * 호스트 콜백(onAddressSelect)에 넘기는 그누보드7 표준 주소 이벤트 + 해외 주소 확장 필드
 *
 * 앞의 7개는 Daum 우편번호 플러그인과 같은 이름이라 기존 화면 콜백이 그대로 받는다.
 */
export interface G7IntlAddressEvent {
    zipcode: string;
    address: string;
    addressDetail: string;
    region: string;
    city: string;
    countryCode: string;
    /** 해외 주소 확장 필드 */
    addressLine1: string;
    addressLine2: string;
    state: string;
    postalCode: string;
    /** 한 줄 주소 (영문 우편 표기 순서, 국가명 포함) */
    formatted: string;
    /** 자동완성 제공자 (직접 입력이면 'manual') */
    provider: string;
    _raw: unknown;
}

/**
 * 국가별 주소 형식 규칙
 */
export interface CountryFormat {
    /** 우편번호 필수 여부 */
    postalRequired: boolean;
    /** 우편번호 형식 (없으면 검사 안 함) */
    postalPattern?: RegExp;
    /** 우편번호 입력 예시 */
    postalExample?: string;
    /** 주/도 필수 여부 */
    stateRequired: boolean;
    /** 주/도 칸 이름 종류 */
    stateLabel: 'state' | 'province' | 'prefecture' | 'region' | 'county' | 'emirate';
    /** 주/도 선택지 (있으면 셀렉트로 표시) */
    states?: ReadonlyArray<readonly [code: string, name: string]>;
    /** 도시 필수 여부 */
    cityRequired: boolean;
}

/**
 * 플러그인 설정 (frontend_schema 로 노출된 값)
 */
export interface IntlAddressSettings {
    provider: 'none' | 'google' | 'loqate' | 'geoapify';
    google_api_key: string;
    loqate_api_key: string;
    geoapify_api_key: string;
    default_country: string;
    allowed_countries: string;
    exclude_kr: boolean;
    theme_color: string;
}

/**
 * 자동완성 후보
 */
export interface Suggestion {
    /** 제공자 내부 ID */
    id: string;
    /** 주 표시 문구 */
    label: string;
    /** 보조 표시 문구 */
    description: string;
    /** 더 좁혀 들어가야 하는 묶음(Loqate 컨테이너 등)이면 true */
    container?: boolean;
    /** 후보 단계에서 이미 주소가 확정된 경우(Geoapify) */
    address?: IntlAddress;
    _raw?: unknown;
}

/**
 * 자동완성 제공자 계약
 */
export interface AddressProvider {
    readonly id: string;
    /** 입력어로 후보를 찾는다. container 후보를 더 펼칠 때는 parentId 를 넘긴다 */
    search(query: string, countryCode: string, signal?: AbortSignal, parentId?: string): Promise<Suggestion[]>;
    /** 후보 하나를 확정 주소로 바꾼다 */
    retrieve(suggestion: Suggestion, countryCode: string, signal?: AbortSignal): Promise<{ address: IntlAddress; raw: unknown }>;
}

/**
 * 호스트 폼에 해외 주소를 직접 써 넣는 대상 정의
 *
 * 이커머스처럼 해외 주소 칸(address_line_1 등)을 따로 가진 화면은 이 정의로 그 칸을 채운다.
 * 확장점을 여는 쪽이 extensionPointProps.intlTarget 으로 넘기거나, 내장 프리셋 이름을 쓴다.
 */
export interface IntlTarget {
    /** 상태 저장 위치 */
    target: 'local' | 'global';
    /** 상태 경로 접두어 (예: 'shipping.') */
    prefix: string;
    /** 필드 이름 매핑 (생략 시 이커머스 이름) */
    fields?: Partial<Record<keyof IntlAddress, string>>;
    /** 함께 기록할 추가 경로 → 주소 필드 (예: { 'checkout.country_code': 'countryCode' }) */
    mirror?: Record<string, keyof IntlAddress>;
    /** 국내용 표준 필드(zipcode·address)를 비워서 콜백에 넘길지 여부 */
    clearDomestic?: boolean;
}
