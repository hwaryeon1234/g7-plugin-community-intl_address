import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapGoogleComponents } from '../providers/google';
import { createLoqateProvider, mapLoqateItem } from '../providers/loqate';
import { createGeoapifyProvider, mapGeoapifyResult } from '../providers/geoapify';
import { createProvider, ProviderError } from '../providers';
import { DEFAULT_SETTINGS } from '../core/runtime';

afterEach(() => {
    vi.unstubAllGlobals();
});

const jsonResponse = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });

describe('Google 구성요소 변환', () => {
    it('미국 주소: 번지+거리, 주는 약어', () => {
        const a = mapGoogleComponents([
            { longText: '1600', types: ['street_number'] },
            { longText: 'Amphitheatre Parkway', types: ['route'] },
            { longText: 'Mountain View', types: ['locality', 'political'] },
            { longText: 'California', shortText: 'CA', types: ['administrative_area_level_1'] },
            { longText: 'United States', shortText: 'US', types: ['country'] },
            { longText: '94043', types: ['postal_code'] },
        ], 'US');
        expect(a).toEqual({ countryCode: 'US', addressLine1: '1600 Amphitheatre Parkway', addressLine2: '', city: 'Mountain View', state: 'CA', postalCode: '94043' });
    });

    it('영국 주소: 도시는 postal_town, 주는 전체 이름', () => {
        const a = mapGoogleComponents([
            { longText: '10', types: ['street_number'] },
            { longText: 'Downing Street', types: ['route'] },
            { longText: 'London', types: ['postal_town'] },
            { longText: 'England', shortText: 'England', types: ['administrative_area_level_1'] },
            { longText: 'United Kingdom', shortText: 'GB', types: ['country'] },
            { longText: 'SW1A 2AA', types: ['postal_code'] },
        ], 'GB');
        expect(a.city).toBe('London');
        expect(a.state).toBe('England');
        expect(a.postalCode).toBe('SW1A 2AA');
    });
});

describe('Loqate', () => {
    it('Retrieve 결과를 변환한다 (미국은 ProvinceCode)', () => {
        const a = mapLoqateItem({ Line1: '1 Main St', Line2: 'Apt 2', City: 'Austin', ProvinceCode: 'TX', ProvinceName: 'Texas', PostalCode: '78701', CountryIso2: 'US' }, 'US');
        expect(a).toEqual({ countryCode: 'US', addressLine1: '1 Main St', addressLine2: 'Apt 2', city: 'Austin', state: 'TX', postalCode: '78701' });
    });

    it('컨테이너 후보를 표시하고, Items[0].Error 는 ProviderError 로 던진다', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse({ Items: [{ Id: 'a', Type: 'Address', Text: '1 Main St' }, { Id: 'b', Type: 'Street', Text: 'Main St', Description: '20 Addresses' }] }))
            .mockResolvedValueOnce(jsonResponse({ Items: [{ Error: '2', Description: 'Unknown key' }] }));
        vi.stubGlobal('fetch', fetchMock);
        const provider = createLoqateProvider('KEY', 'en');

        const list = await provider.search('main', 'US');
        expect(list.map((s) => s.container)).toEqual([false, true]);
        expect(String(fetchMock.mock.calls[0][0])).toContain('Countries=US');

        await expect(provider.search('main', 'US')).rejects.toBeInstanceOf(ProviderError);
    });

    it('컨테이너를 펼칠 때 Container 매개변수를 보낸다', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ Items: [] }));
        vi.stubGlobal('fetch', fetchMock);
        await createLoqateProvider('KEY', 'en').search('main', 'US', undefined, 'US|LP|B|123');
        expect(String(fetchMock.mock.calls[0][0])).toContain('Container=US%7CLP%7CB%7C123');
    });
});

describe('Geoapify', () => {
    it('후보에 주소가 이미 들어 있어 retrieve 가 추가 요청을 하지 않는다', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
            results: [{ place_id: 'p1', housenumber: '350', street: '5th Ave', name: 'Empire State Building', city: 'New York', state: 'New York', state_code: 'NY', postcode: '10118', country_code: 'us', address_line1: 'Empire State Building', address_line2: '350 5th Ave, New York' }],
        }));
        vi.stubGlobal('fetch', fetchMock);
        const provider = createGeoapifyProvider('KEY', 'en');

        const [first] = await provider.search('empire', 'US');
        const { address } = await provider.retrieve(first, 'US');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(address).toEqual({ countryCode: 'US', addressLine1: '350 5th Ave', addressLine2: 'Empire State Building', city: 'New York', state: 'NY', postalCode: '10118' });
        expect(String(fetchMock.mock.calls[0][0])).toContain('filter=countrycode%3Aus');
    });

    it('미국 외에는 주 전체 이름을 쓴다', () => {
        expect(mapGeoapifyResult({ street: 'Rue de Rivoli', housenumber: '1', city: 'Paris', state: 'Île-de-France', state_code: 'IDF', postcode: '75001', country_code: 'fr' }, 'FR').state).toBe('Île-de-France');
    });
});

describe('HTTP 오류', () => {
    it('HTTP 오류는 ProviderError(status) 로 던진다', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'API key not valid' } }, 403)));
        const provider = createProvider({ ...DEFAULT_SETTINGS, provider: 'google', google_api_key: 'K' }, 'en')!;
        await expect(provider.search('x', 'US')).rejects.toMatchObject({ name: 'ProviderError', status: 403, message: 'API key not valid' });
    });
});

describe('createProvider', () => {
    it('사용 안 함이거나 키가 비면 null', () => {
        expect(createProvider(DEFAULT_SETTINGS, 'en')).toBeNull();
        expect(createProvider({ ...DEFAULT_SETTINGS, provider: 'loqate', loqate_api_key: '  ' }, 'en')).toBeNull();
        expect(createProvider({ ...DEFAULT_SETTINGS, provider: 'loqate', loqate_api_key: 'K' }, 'en')?.id).toBe('loqate');
    });
});
