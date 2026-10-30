/**
 * 다른 확장·템플릿이 쓰는 공개 JS API (window.G7IntlAddress)
 *
 * 레이아웃 액션이 아니라 스크립트에서 해외 주소를 다루고 싶을 때 쓴다 — 예: 다른 모듈의 핸들러가
 * 저장 전에 주소를 검증하거나, 목록에 한 줄 주소를 그리거나, 자기 화면에서 입력 창을 직접 연다.
 * 서버 API 가 아니라 브라우저 API 다(이 플러그인에는 백엔드가 없다).
 *
 * @module api
 */

import type { IntlAddress, IntlAddressSettings } from './types';
import { COUNTRY_CODES, getCountryFormat, listCountries, parseCountryList } from './core/countries';
import { formatOneLine, normalizeAddress, toG7Event, validateAddress } from './core/address';
import { currentLocale, readSettings } from './core/runtime';
import { createProvider } from './providers';
import { openAddressDialog } from './ui/dialog';

/** 공개 API 버전 — 계약을 깨는 변경이면 올린다 */
export const API_VERSION = 1;

export const publicApi = {
    version: API_VERSION,

    /** 국가 목록 (설정의 허용 국가·대한민국 제외 반영). allowed 를 넘기면 그와도 겹치는 국가만 */
    getCountries(options: { allowed?: string[] | string | null; locale?: string } = {}): Array<{ code: string; name: string }> {
        const settings = readSettings();
        const fromSettings = parseCountryList(settings.allowed_countries);
        const fromCaller = options.allowed === undefined || options.allowed === null ? null : parseCountryList(options.allowed);
        let allowed: string[] | null = fromSettings.length > 0 ? fromSettings : null;
        if (fromCaller) {
            allowed = allowed ? allowed.filter((c) => fromCaller.includes(c)) : fromCaller;
        }

        return listCountries({ allowed, exclude: settings.exclude_kr ? ['KR'] : [], locale: options.locale ?? currentLocale() });
    },

    /** 모든 ISO 3166-1 alpha-2 코드 */
    allCountryCodes: (): string[] => [...COUNTRY_CODES],

    /** 국가별 주소 형식 (필수 칸·우편번호 형식·주/도 선택지). 정규식은 source 문자열로 돌려준다 */
    getFormat(countryCode: string) {
        const format = getCountryFormat(countryCode);

        return {
            ...format,
            postalPattern: format.postalPattern?.source ?? null,
            states: format.states ? format.states.map(([code, name]) => ({ code, name })) : null,
        };
    },

    /** 주소 검증 — 오류가 없으면 빈 객체. 값은 오류 코드(required · invalid_postal · invalid_country · too_long) */
    validate: (address: Partial<IntlAddress>) => validateAddress(address),

    /** 주소 정리 (공백·대소문자) */
    normalize: (address: Partial<IntlAddress>) => normalizeAddress(address),

    /** 한 줄 주소 (국제 우편 영문 표기 순서) */
    format: (address: Partial<IntlAddress>, countryLocale: string = 'en') => formatOneLine(normalizeAddress(address), countryLocale),

    /** 이커머스 칸 이름(address_line_1 · intl_city …)을 쓰는 객체를 플러그인 주소로 바꾼다 */
    fromEcommerce(record: Record<string, any>): IntlAddress {
        return normalizeAddress({
            countryCode: record.country_code ?? record.recipient_country_code,
            addressLine1: record.address_line_1,
            addressLine2: record.address_line_2,
            city: record.intl_city ?? record.city,
            state: record.intl_state ?? record.state,
            postalCode: record.intl_postal_code ?? record.postal_code,
        });
    },

    /**
     * 입력 창을 직접 연다. 확정하면 표준 이벤트(G7IntlAddressEvent), 닫으면 null.
     */
    async open(options: { countries?: string[] | string | null; defaultCountry?: string; initial?: Partial<IntlAddress>; settings?: Partial<IntlAddressSettings> } = {}) {
        const settings = readSettings(options.settings ?? {});
        const locale = currentLocale();
        const countries = publicApi.getCountries({ allowed: options.countries ?? null, locale });
        if (countries.length === 0) {
            return null;
        }
        const preferred = String(options.initial?.countryCode || options.defaultCountry || settings.default_country).toUpperCase();
        const initialCountry = countries.some((c) => c.code === preferred) ? preferred : countries[0].code;
        const result = await openAddressDialog({
            countries,
            initialCountry,
            initial: options.initial?.countryCode?.toUpperCase() === initialCountry ? options.initial : null,
            provider: createProvider(settings, locale),
            themeColor: settings.theme_color,
        });

        return result ? toG7Event(result.address, { provider: result.provider, raw: result.raw }) : null;
    },
};
