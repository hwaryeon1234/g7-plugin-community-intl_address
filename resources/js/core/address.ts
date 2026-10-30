/**
 * 해외 주소 정규화·검증·표기
 *
 * 화면(모달)·제공자·외부 API(window.G7IntlAddress) 가 모두 이 모듈 하나를 거친다 — 검증 규칙이 갈라지지 않게.
 *
 * @module address
 */

import type { G7IntlAddressEvent, IntlAddress } from '../types';
import { countryName, getCountryFormat, isCountryCode } from './countries';

/** 사용자 회원 주소(users.zipcode)가 받는 최대 길이 */
const DOMESTIC_ZIPCODE_MAX = 10;

/** 검증 오류 코드 (번역 키 errors.{code}) */
export type AddressErrorCode = 'required' | 'invalid_postal' | 'invalid_country' | 'too_long';

export type AddressErrors = Partial<Record<keyof IntlAddress, AddressErrorCode>>;

/** 필드별 최대 길이 — 이커머스 테이블 컬럼 길이와 같다 */
export const FIELD_MAX_LENGTH: Readonly<Record<keyof IntlAddress, number>> = {
    countryCode: 2,
    addressLine1: 255,
    addressLine2: 255,
    city: 100,
    state: 100,
    postalCode: 20,
};

/**
 * 빈 주소를 만듭니다.
 */
export function emptyAddress(countryCode: string = ''): IntlAddress {
    return { countryCode: countryCode.toUpperCase(), addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '' };
}

/**
 * 주소 값을 다듬습니다 — 앞뒤 공백·연속 공백 제거, 국가 코드 대문자, 우편번호 대문자.
 */
export function normalizeAddress(input: Partial<IntlAddress>): IntlAddress {
    const clean = (v: unknown): string => String(v ?? '').replace(/\s+/g, ' ').trim();

    return {
        countryCode: clean(input.countryCode).toUpperCase(),
        addressLine1: clean(input.addressLine1),
        addressLine2: clean(input.addressLine2),
        city: clean(input.city),
        state: clean(input.state),
        postalCode: clean(input.postalCode).toUpperCase(),
    };
}

/**
 * 국가 형식 규칙으로 주소를 검증합니다.
 *
 * @return AddressErrors 오류가 없으면 빈 객체
 */
export function validateAddress(input: Partial<IntlAddress>): AddressErrors {
    const address = normalizeAddress(input);
    const errors: AddressErrors = {};

    if (!isCountryCode(address.countryCode)) {
        errors.countryCode = 'invalid_country';

        return errors;
    }

    const format = getCountryFormat(address.countryCode);

    if (address.addressLine1 === '') {
        errors.addressLine1 = 'required';
    }
    if (format.cityRequired && address.city === '') {
        errors.city = 'required';
    }
    if (format.stateRequired && address.state === '') {
        errors.state = 'required';
    }
    if (address.postalCode === '') {
        if (format.postalRequired) {
            errors.postalCode = 'required';
        }
    } else if (format.postalPattern && !format.postalPattern.test(address.postalCode)) {
        errors.postalCode = 'invalid_postal';
    }

    (Object.keys(FIELD_MAX_LENGTH) as Array<keyof IntlAddress>).forEach((field) => {
        if (!errors[field] && address[field].length > FIELD_MAX_LENGTH[field]) {
            errors[field] = 'too_long';
        }
    });

    return errors;
}

/**
 * 주소를 한 줄로 씁니다 — 국제 우편 영문 표기 순서(주소 1, 주소 2, 도시, 주 우편번호, 국가).
 *
 * @param address 주소
 * @param countryLocale 국가 이름 언어 (국제 우편은 영문이 기본)
 */
export function formatOneLine(address: IntlAddress, countryLocale: string = 'en'): string {
    const statePostal = [address.state, address.postalCode].filter(Boolean).join(' ');
    const country = address.countryCode ? countryName(address.countryCode, countryLocale) : '';

    return [address.addressLine1, address.addressLine2, address.city, statePostal, country]
        .filter((part) => part !== '')
        .join(', ');
}

/**
 * 호스트 콜백에 넘길 표준 이벤트를 만듭니다.
 *
 * 해외 칸이 없는 화면(회원 정보 등)은 zipcode·address 만 받으므로 우편번호와 한 줄 주소를 그 자리에 넣는다.
 * 해외 칸을 따로 채우는 화면(clearDomestic)은 국내 칸이 남지 않도록 비워 넘긴다 — 국가를 바꿀 때
 * 그 화면들이 국내 칸을 비우는 것과 같은 상태가 된다.
 *
 * @param address 확정 주소
 * @param options.provider 제공자 ID (직접 입력이면 'manual')
 * @param options.raw 제공자 원본 응답
 * @param options.clearDomestic 국내 칸을 비울지 여부
 */
export function toG7Event(
    address: IntlAddress,
    options: { provider: string; raw?: unknown; clearDomestic?: boolean },
): G7IntlAddressEvent {
    const formatted = formatOneLine(address);
    const lineAddress = [address.addressLine1, address.addressLine2].filter(Boolean).join(', ');
    const tail = formatOneLine({ ...address, addressLine1: '', addressLine2: '', postalCode: '' });

    return {
        zipcode: options.clearDomestic ? '' : address.postalCode.slice(0, DOMESTIC_ZIPCODE_MAX),
        address: options.clearDomestic ? '' : [lineAddress, tail].filter(Boolean).join(', '),
        addressDetail: '',
        region: address.state,
        city: address.city,
        countryCode: address.countryCode,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        state: address.state,
        postalCode: address.postalCode,
        formatted,
        provider: options.provider,
        _raw: options.raw ?? null,
    };
}
