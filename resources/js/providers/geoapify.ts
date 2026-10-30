/**
 * Geoapify Address Autocomplete 제공자
 *
 * 후보 응답에 주소 구성요소가 이미 들어 있어 확정 단계의 추가 요청이 없다.
 *
 * @see https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/
 * @module providers/geoapify
 */

import type { AddressProvider, IntlAddress, Suggestion } from '../types';
import { emptyAddress } from '../core/address';
import { fetchJson, ProviderError } from './http';

const AUTOCOMPLETE_URL = 'https://api.geoapify.com/v1/geocode/autocomplete';

/**
 * Geoapify 결과 한 건을 플러그인 주소로 바꿉니다.
 */
export function mapGeoapifyResult(result: any, fallbackCountry: string): IntlAddress {
    const countryCode = String(result?.country_code || fallbackCountry).toUpperCase();
    const address = emptyAddress(countryCode);
    const street = [result?.housenumber, result?.street].filter(Boolean).join(' ');
    const useCode = ['US', 'CA', 'AU'].includes(countryCode) && result?.state_code;

    address.addressLine1 = street || String(result?.name ?? result?.address_line1 ?? '');
    address.addressLine2 = street && result?.name && result.name !== street ? String(result.name) : '';
    address.city = String(result?.city ?? result?.town ?? result?.village ?? result?.county ?? '');
    address.state = String((useCode ? result.state_code : result?.state) ?? '');
    address.postalCode = String(result?.postcode ?? '');

    return address;
}

/**
 * Geoapify 제공자를 만듭니다.
 */
export function createGeoapifyProvider(apiKey: string, language: string): AddressProvider {
    return {
        id: 'geoapify',

        async search(query, countryCode, signal) {
            const params = new URLSearchParams({
                text: query,
                filter: `countrycode:${countryCode.toLowerCase()}`,
                lang: language,
                limit: '8',
                format: 'json',
                apiKey,
            });
            const json = await fetchJson(`${AUTOCOMPLETE_URL}?${params}`, { signal });

            return (json?.results ?? []).map((result: any, index: number): Suggestion => ({
                id: String(result.place_id ?? index),
                label: String(result.address_line1 ?? result.formatted ?? ''),
                description: String(result.address_line2 ?? ''),
                address: mapGeoapifyResult(result, countryCode),
                _raw: result,
            }));
        },

        async retrieve(suggestion) {
            if (!suggestion.address) {
                throw new ProviderError('missing address');
            }

            return { address: suggestion.address, raw: suggestion._raw };
        },
    };
}
