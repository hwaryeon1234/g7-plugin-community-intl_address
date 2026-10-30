/**
 * 국가 목록과 국가별 주소 형식 규칙
 *
 * 국가 이름은 데이터로 들고 있지 않는다 — 브라우저의 Intl.DisplayNames 가 화면 언어로 만들어 준다.
 * 형식 규칙은 우편 실무에서 자주 쓰는 나라만 구체적으로 적고, 나머지는 DEFAULT_FORMAT(주소 1·도시 필수)을 쓴다.
 *
 * @module countries
 */

import type { CountryFormat } from '../types';

/** ISO 3166-1 alpha-2 전체 (예외 예약 코드 제외) */
export const COUNTRY_CODES: ReadonlyArray<string> = (
    'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
    'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
    'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
    'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT ' +
    'MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
    'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG ' +
    'UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'
).split(' ');

const US_STATES = [
    ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
    ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'],
    ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'],
    ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
    ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
    ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'],
    ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'],
    ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
    ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'],
    ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'],
    ['WY', 'Wyoming'], ['AS', 'American Samoa'], ['GU', 'Guam'], ['MP', 'Northern Mariana Islands'],
    ['PR', 'Puerto Rico'], ['VI', 'U.S. Virgin Islands'], ['AA', 'Armed Forces Americas'],
    ['AE', 'Armed Forces Europe'], ['AP', 'Armed Forces Pacific'],
] as const;

const CA_PROVINCES = [
    ['AB', 'Alberta'], ['BC', 'British Columbia'], ['MB', 'Manitoba'], ['NB', 'New Brunswick'],
    ['NL', 'Newfoundland and Labrador'], ['NS', 'Nova Scotia'], ['NT', 'Northwest Territories'], ['NU', 'Nunavut'],
    ['ON', 'Ontario'], ['PE', 'Prince Edward Island'], ['QC', 'Quebec'], ['SK', 'Saskatchewan'], ['YT', 'Yukon'],
] as const;

const AU_STATES = [
    ['ACT', 'Australian Capital Territory'], ['NSW', 'New South Wales'], ['NT', 'Northern Territory'],
    ['QLD', 'Queensland'], ['SA', 'South Australia'], ['TAS', 'Tasmania'], ['VIC', 'Victoria'], ['WA', 'Western Australia'],
] as const;

const JP_PREFECTURES = (
    'Hokkaido Aomori Iwate Miyagi Akita Yamagata Fukushima Ibaraki Tochigi Gunma Saitama Chiba Tokyo Kanagawa ' +
    'Niigata Toyama Ishikawa Fukui Yamanashi Nagano Gifu Shizuoka Aichi Mie Shiga Kyoto Osaka Hyogo Nara Wakayama ' +
    'Tottori Shimane Okayama Hiroshima Yamaguchi Tokushima Kagawa Ehime Kochi Fukuoka Saga Nagasaki Kumamoto Oita ' +
    'Miyazaki Kagoshima Okinawa'
).split(' ').map((name) => [name, name] as const);

/** 형식 규칙이 따로 없는 나라에 쓰는 기본값 */
export const DEFAULT_FORMAT: CountryFormat = {
    postalRequired: false,
    stateRequired: false,
    stateLabel: 'region',
    cityRequired: true,
};

const digits = (n: number): RegExp => new RegExp(`^\\d{${n}}$`);

/** 국가별 형식 규칙 */
export const COUNTRY_FORMATS: Readonly<Record<string, CountryFormat>> = {
    US: { postalRequired: true, postalPattern: /^\d{5}(-\d{4})?$/, postalExample: '94105', stateRequired: true, stateLabel: 'state', states: US_STATES, cityRequired: true },
    CA: { postalRequired: true, postalPattern: /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/i, postalExample: 'K1A 0B1', stateRequired: true, stateLabel: 'province', states: CA_PROVINCES, cityRequired: true },
    AU: { postalRequired: true, postalPattern: digits(4), postalExample: '2000', stateRequired: true, stateLabel: 'state', states: AU_STATES, cityRequired: true },
    JP: { postalRequired: true, postalPattern: /^\d{3}-?\d{4}$/, postalExample: '100-0001', stateRequired: true, stateLabel: 'prefecture', states: JP_PREFECTURES, cityRequired: true },
    CN: { postalRequired: true, postalPattern: digits(6), postalExample: '100000', stateRequired: true, stateLabel: 'province', cityRequired: true },
    GB: { postalRequired: true, postalPattern: /^(GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/i, postalExample: 'SW1A 1AA', stateRequired: false, stateLabel: 'county', cityRequired: true },
    IE: { postalRequired: false, postalPattern: /^([AC-FHKNPRTV-Y]\d{2}|D6W) ?[0-9AC-FHKNPRTV-Y]{4}$/i, postalExample: 'D02 X285', stateRequired: false, stateLabel: 'county', cityRequired: true },
    DE: { postalRequired: true, postalPattern: digits(5), postalExample: '10115', stateRequired: false, stateLabel: 'state', cityRequired: true },
    FR: { postalRequired: true, postalPattern: digits(5), postalExample: '75001', stateRequired: false, stateLabel: 'region', cityRequired: true },
    IT: { postalRequired: true, postalPattern: digits(5), postalExample: '00118', stateRequired: true, stateLabel: 'province', cityRequired: true },
    ES: { postalRequired: true, postalPattern: digits(5), postalExample: '28001', stateRequired: true, stateLabel: 'province', cityRequired: true },
    NL: { postalRequired: true, postalPattern: /^\d{4} ?[A-Z]{2}$/i, postalExample: '1012 AB', stateRequired: false, stateLabel: 'province', cityRequired: true },
    BE: { postalRequired: true, postalPattern: digits(4), postalExample: '1000', stateRequired: false, stateLabel: 'province', cityRequired: true },
    CH: { postalRequired: true, postalPattern: digits(4), postalExample: '8001', stateRequired: false, stateLabel: 'region', cityRequired: true },
    AT: { postalRequired: true, postalPattern: digits(4), postalExample: '1010', stateRequired: false, stateLabel: 'state', cityRequired: true },
    DK: { postalRequired: true, postalPattern: digits(4), postalExample: '1050', stateRequired: false, stateLabel: 'region', cityRequired: true },
    NO: { postalRequired: true, postalPattern: digits(4), postalExample: '0150', stateRequired: false, stateLabel: 'county', cityRequired: true },
    SE: { postalRequired: true, postalPattern: /^\d{3} ?\d{2}$/, postalExample: '111 22', stateRequired: false, stateLabel: 'county', cityRequired: true },
    FI: { postalRequired: true, postalPattern: digits(5), postalExample: '00100', stateRequired: false, stateLabel: 'region', cityRequired: true },
    PL: { postalRequired: true, postalPattern: /^\d{2}-\d{3}$/, postalExample: '00-001', stateRequired: false, stateLabel: 'province', cityRequired: true },
    PT: { postalRequired: true, postalPattern: /^\d{4}-\d{3}$/, postalExample: '1000-001', stateRequired: false, stateLabel: 'region', cityRequired: true },
    CZ: { postalRequired: true, postalPattern: /^\d{3} ?\d{2}$/, postalExample: '110 00', stateRequired: false, stateLabel: 'region', cityRequired: true },
    RU: { postalRequired: true, postalPattern: digits(6), postalExample: '101000', stateRequired: true, stateLabel: 'region', cityRequired: true },
    NZ: { postalRequired: true, postalPattern: digits(4), postalExample: '6011', stateRequired: false, stateLabel: 'region', cityRequired: true },
    SG: { postalRequired: true, postalPattern: digits(6), postalExample: '018956', stateRequired: false, stateLabel: 'region', cityRequired: false },
    HK: { postalRequired: false, stateRequired: true, stateLabel: 'region', states: [['Hong Kong Island', 'Hong Kong Island'], ['Kowloon', 'Kowloon'], ['New Territories', 'New Territories']], cityRequired: false },
    MO: { postalRequired: false, stateRequired: false, stateLabel: 'region', cityRequired: false },
    TW: { postalRequired: true, postalPattern: /^\d{3}(\d{2,3})?$/, postalExample: '100', stateRequired: false, stateLabel: 'county', cityRequired: true },
    IN: { postalRequired: true, postalPattern: /^\d{6}$/, postalExample: '110001', stateRequired: true, stateLabel: 'state', cityRequired: true },
    TH: { postalRequired: true, postalPattern: digits(5), postalExample: '10200', stateRequired: true, stateLabel: 'province', cityRequired: true },
    VN: { postalRequired: false, postalPattern: digits(6), postalExample: '100000', stateRequired: true, stateLabel: 'province', cityRequired: true },
    MY: { postalRequired: true, postalPattern: digits(5), postalExample: '50050', stateRequired: true, stateLabel: 'state', cityRequired: true },
    ID: { postalRequired: true, postalPattern: digits(5), postalExample: '10110', stateRequired: true, stateLabel: 'province', cityRequired: true },
    PH: { postalRequired: true, postalPattern: digits(4), postalExample: '1000', stateRequired: true, stateLabel: 'province', cityRequired: true },
    MX: { postalRequired: true, postalPattern: digits(5), postalExample: '06000', stateRequired: true, stateLabel: 'state', cityRequired: true },
    BR: { postalRequired: true, postalPattern: /^\d{5}-?\d{3}$/, postalExample: '01310-100', stateRequired: true, stateLabel: 'state', cityRequired: true },
    AR: { postalRequired: true, postalPattern: /^([A-Z]\d{4}[A-Z]{3}|\d{4})$/i, postalExample: 'C1000AAA', stateRequired: true, stateLabel: 'province', cityRequired: true },
    IL: { postalRequired: true, postalPattern: digits(7), postalExample: '9100001', stateRequired: false, stateLabel: 'region', cityRequired: true },
    TR: { postalRequired: true, postalPattern: digits(5), postalExample: '34000', stateRequired: true, stateLabel: 'province', cityRequired: true },
    SA: { postalRequired: true, postalPattern: /^\d{5}(-\d{4})?$/, postalExample: '11564', stateRequired: false, stateLabel: 'region', cityRequired: true },
    AE: { postalRequired: false, stateRequired: true, stateLabel: 'emirate', states: [['Abu Dhabi', 'Abu Dhabi'], ['Ajman', 'Ajman'], ['Dubai', 'Dubai'], ['Fujairah', 'Fujairah'], ['Ras al Khaimah', 'Ras al Khaimah'], ['Sharjah', 'Sharjah'], ['Umm al Quwain', 'Umm al Quwain']], cityRequired: true },
    ZA: { postalRequired: true, postalPattern: digits(4), postalExample: '0001', stateRequired: true, stateLabel: 'province', cityRequired: true },
    KR: { postalRequired: true, postalPattern: digits(5), postalExample: '04524', stateRequired: true, stateLabel: 'province', cityRequired: true },
};

/**
 * 국가 코드에 맞는 형식 규칙을 돌려줍니다.
 *
 * @param countryCode ISO 3166-1 alpha-2
 * @return CountryFormat 형식 규칙 (없으면 기본값)
 */
export function getCountryFormat(countryCode: string): CountryFormat {
    return COUNTRY_FORMATS[String(countryCode || '').toUpperCase()] ?? DEFAULT_FORMAT;
}

/**
 * 유효한 국가 코드인지 판정합니다.
 */
export function isCountryCode(code: unknown): code is string {
    return typeof code === 'string' && COUNTRY_CODES.includes(code.toUpperCase());
}

/**
 * 국가 이름을 화면 언어로 돌려줍니다. Intl.DisplayNames 가 없거나 모르는 코드면 코드를 그대로 씁니다.
 *
 * @param code 국가 코드
 * @param locale 화면 언어 (예: 'ko', 'en')
 */
export function countryName(code: string, locale: string): string {
    try {
        const names = new Intl.DisplayNames([locale, 'en'], { type: 'region' });

        return names.of(code.toUpperCase()) ?? code;
    } catch {
        return code;
    }
}

/**
 * 국가 목록을 만듭니다.
 *
 * 허용 목록(allowed) 이 있으면 그 국가만, exclude 에 든 국가는 빼고, 이름순으로 정렬합니다.
 *
 * @param options.allowed 허용 국가 (null·빈 배열이면 전체)
 * @param options.exclude 제외 국가
 * @param options.locale 이름 표시 언어
 */
export function listCountries(options: { allowed?: ReadonlyArray<string> | null; exclude?: ReadonlyArray<string>; locale: string }): Array<{ code: string; name: string }> {
    const allowed = (options.allowed ?? []).map((c) => c.toUpperCase()).filter(isCountryCode);
    const exclude = new Set((options.exclude ?? []).map((c) => c.toUpperCase()));
    const base = allowed.length > 0 ? COUNTRY_CODES.filter((c) => allowed.includes(c)) : COUNTRY_CODES;
    const collator = new Intl.Collator(options.locale);

    return base
        .filter((code) => !exclude.has(code))
        .map((code) => ({ code, name: countryName(code, options.locale) }))
        .sort((a, b) => collator.compare(a.name, b.name));
}

/**
 * 쉼표·공백으로 구분된 국가 코드 문자열을 배열로 바꿉니다. 잘못된 코드는 버립니다.
 */
export function parseCountryList(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map((c) => String(c).trim().toUpperCase()).filter(isCountryCode);
    }

    return String(value ?? '')
        .split(/[\s,]+/)
        .map((c) => c.trim().toUpperCase())
        .filter(isCountryCode);
}
