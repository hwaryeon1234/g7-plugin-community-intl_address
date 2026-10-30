/**
 * Loqate (Address Capture Interactive) 제공자
 *
 * Find 는 주소 또는 「컨테이너」(거리·건물 묶음)를 돌려준다. 컨테이너를 고르면 그 Id 로 다시 Find 해서
 * 펼치고, 주소를 고르면 Retrieve 로 확정한다.
 *
 * @see https://docs.loqate.com/api-reference/capture/find
 * @module providers/loqate
 */

import type { AddressProvider, IntlAddress, Suggestion } from '../types';
import { emptyAddress } from '../core/address';
import { fetchJson, ProviderError } from './http';

const FIND_URL = 'https://api.addressy.com/Capture/Interactive/Find/v1.1/json3.ws';
const RETRIEVE_URL = 'https://api.addressy.com/Capture/Interactive/Retrieve/v1.2/json3.ws';

/**
 * Loqate 는 오류를 HTTP 200 + Items[0].Error 로 돌려준다.
 */
function assertNoError(json: any): void {
    const first = json?.Items?.[0];

    if (first && first.Error !== undefined) {
        throw new ProviderError(String(first.Description ?? first.Cause ?? `Loqate error ${first.Error}`));
    }
}

/**
 * Retrieve 결과 한 건을 플러그인 주소로 바꿉니다.
 */
export function mapLoqateItem(item: any, fallbackCountry: string): IntlAddress {
    const countryCode = String(item?.CountryIso2 || fallbackCountry).toUpperCase();
    const address = emptyAddress(countryCode);
    const useCode = ['US', 'CA', 'AU'].includes(countryCode);

    address.addressLine1 = String(item?.Line1 ?? '');
    address.addressLine2 = [item?.Line2, item?.Line3].filter(Boolean).join(', ');
    address.city = String(item?.City ?? '');
    address.state = String((useCode ? item?.ProvinceCode : item?.ProvinceName) || item?.Province || '');
    address.postalCode = String(item?.PostalCode ?? '');

    return address;
}

/**
 * Loqate 제공자를 만듭니다.
 */
export function createLoqateProvider(apiKey: string, language: string): AddressProvider {
    return {
        id: 'loqate',

        async search(query, countryCode, signal, parentId) {
            const params = new URLSearchParams({ Key: apiKey, Text: query, Countries: countryCode, Language: language, Limit: '10' });

            if (parentId) {
                params.set('Container', parentId);
            }

            const json = await fetchJson(`${FIND_URL}?${params}`, { signal });
            assertNoError(json);

            return (json?.Items ?? []).map((item: any): Suggestion => ({
                id: String(item.Id),
                label: String(item.Text ?? ''),
                description: String(item.Description ?? ''),
                container: item.Type !== 'Address',
                _raw: item,
            }));
        },

        async retrieve(suggestion, countryCode, signal) {
            const params = new URLSearchParams({ Key: apiKey, Id: suggestion.id });
            const json = await fetchJson(`${RETRIEVE_URL}?${params}`, { signal });
            assertNoError(json);

            const items: any[] = json?.Items ?? [];
            // 언어별로 여러 건이 오면 영문(ENG) 결과를 우선한다 — 국제 우편 표기
            const item = items.find((i) => i.Language === 'ENG') ?? items[0];

            if (!item) {
                throw new ProviderError('empty result');
            }

            return { address: mapLoqateItem(item, countryCode), raw: item };
        },
    };
}
