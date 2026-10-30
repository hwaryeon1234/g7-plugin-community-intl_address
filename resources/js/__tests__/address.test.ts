import { describe, expect, it } from 'vitest';
import { formatOneLine, normalizeAddress, toG7Event, validateAddress } from '../core/address';
import { getCountryFormat, listCountries, parseCountryList } from '../core/countries';

const us = { countryCode: 'us', addressLine1: ' 1600  Amphitheatre Pkwy ', addressLine2: '', city: 'Mountain View', state: 'CA', postalCode: '94043' };

describe('normalizeAddress', () => {
    it('공백을 정리하고 국가 코드를 대문자로 바꾼다', () => {
        const a = normalizeAddress(us);
        expect(a.countryCode).toBe('US');
        expect(a.addressLine1).toBe('1600 Amphitheatre Pkwy');
    });
});

describe('validateAddress', () => {
    it('올바른 미국 주소는 오류가 없다', () => {
        expect(validateAddress(us)).toEqual({});
    });

    it('미국은 주와 우편번호가 필수이고 형식을 본다', () => {
        expect(validateAddress({ ...us, state: '' }).state).toBe('required');
        expect(validateAddress({ ...us, postalCode: '' }).postalCode).toBe('required');
        expect(validateAddress({ ...us, postalCode: '9404' }).postalCode).toBe('invalid_postal');
        expect(validateAddress({ ...us, postalCode: '94043-1351' })).toEqual({});
    });

    it('영국 우편번호 형식을 검사하고 주는 선택이다', () => {
        const gb = { countryCode: 'GB', addressLine1: '10 Downing St', city: 'London', postalCode: 'sw1a 2aa' };
        expect(validateAddress(gb)).toEqual({});
        expect(validateAddress({ ...gb, postalCode: '12345' }).postalCode).toBe('invalid_postal');
    });

    it('아일랜드 Eircode 는 선택이지만 쓰면 형식을 본다', () => {
        const ie = { countryCode: 'IE', addressLine1: '1 Main St', city: 'Dublin' };
        expect(validateAddress(ie)).toEqual({});
        expect(validateAddress({ ...ie, postalCode: 'D02 X285' })).toEqual({});
        expect(validateAddress({ ...ie, postalCode: 'X' }).postalCode).toBe('invalid_postal');
    });

    it('형식 규칙이 없는 나라는 주소 1과 도시만 필수다', () => {
        expect(validateAddress({ countryCode: 'FJ', addressLine1: '1 Victoria Pde', city: 'Suva' })).toEqual({});
        expect(validateAddress({ countryCode: 'FJ', addressLine1: '', city: '' })).toEqual({ addressLine1: 'required', city: 'required' });
    });

    it('잘못된 국가 코드는 국가 오류만 낸다', () => {
        expect(validateAddress({ ...us, countryCode: 'ZZ' })).toEqual({ countryCode: 'invalid_country' });
    });

    it('컬럼 길이를 넘으면 too_long', () => {
        expect(validateAddress({ ...us, city: 'x'.repeat(101) }).city).toBe('too_long');
    });
});

describe('formatOneLine / toG7Event', () => {
    const address = normalizeAddress({ ...us, addressLine2: 'Bldg 40' });

    it('국제 우편 영문 순서로 한 줄을 만든다', () => {
        expect(formatOneLine(address)).toBe('1600 Amphitheatre Pkwy, Bldg 40, Mountain View, CA 94043, United States');
    });

    it('해외 칸이 없는 화면에는 zipcode·address 에 우편번호와 한 줄 주소를 넣는다', () => {
        const e = toG7Event(address, { provider: 'manual' });
        expect(e.zipcode).toBe('94043');
        expect(e.address).toBe('1600 Amphitheatre Pkwy, Bldg 40, Mountain View, CA, United States');
        expect(e.countryCode).toBe('US');
        expect(e.region).toBe('CA');
        expect(e.addressLine1).toBe('1600 Amphitheatre Pkwy');
    });

    it('clearDomestic 이면 국내 칸을 비운다', () => {
        const e = toG7Event(address, { provider: 'google', clearDomestic: true });
        expect(e.zipcode).toBe('');
        expect(e.address).toBe('');
        expect(e.postalCode).toBe('94043');
        expect(e.provider).toBe('google');
    });

    it('회원 우편번호 칸(10자)을 넘지 않게 자른다', () => {
        const e = toG7Event({ ...address, postalCode: '12345678901234' }, { provider: 'manual' });
        expect(e.zipcode).toHaveLength(10);
    });
});

describe('countries', () => {
    it('허용·제외 목록을 반영한다', () => {
        const list = listCountries({ allowed: ['us', 'kr', 'jp', 'zz'], exclude: ['KR'], locale: 'en' });
        expect(list.map((c) => c.code).sort()).toEqual(['JP', 'US']);
    });

    it('허용 목록이 없으면 전체(제외 반영)', () => {
        const list = listCountries({ allowed: null, exclude: ['KR'], locale: 'ko' });
        expect(list.length).toBeGreaterThan(240);
        expect(list.some((c) => c.code === 'KR')).toBe(false);
    });

    it('국가 목록 문자열을 파싱한다', () => {
        expect(parseCountryList('us,JP CN , xx')).toEqual(['US', 'JP', 'CN']);
        expect(parseCountryList('')).toEqual([]);
        expect(parseCountryList(['gb', 'nope'])).toEqual(['GB']);
    });

    it('주/도 선택지가 있는 나라', () => {
        expect(getCountryFormat('us').states?.some(([code]) => code === 'NY')).toBe(true);
        expect(getCountryFormat('JP').states).toHaveLength(47);
        expect(getCountryFormat('FR').states).toBeUndefined();
    });
});
