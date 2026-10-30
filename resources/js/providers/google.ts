/**
 * Google Places API (New) 제공자
 *
 * SDK 스크립트 없이 REST 로 부른다 — places.googleapis.com 은 브라우저 요청(CORS)을 받는다.
 * 같은 sessionToken 으로 자동완성 → 상세 조회를 묶어야 요금이 「세션」 단위로 계산된다.
 *
 * @see https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
 * @module providers/google
 */

import type { AddressProvider, IntlAddress, Suggestion } from '../types';
import { emptyAddress } from '../core/address';
import { fetchJson } from './http';

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const DETAILS_URL = 'https://places.googleapis.com/v1/places/';

interface GoogleComponent {
    longText?: string;
    shortText?: string;
    types?: string[];
}

/**
 * 세션 토큰을 만듭니다 (UUID v4 형식).
 */
function newSessionToken(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;

        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

/**
 * Google addressComponents 를 플러그인 주소로 바꿉니다.
 *
 * 국가마다 쓰는 구성요소가 달라 후보 타입을 순서대로 본다 — 예: 영국 도시는 postal_town,
 * 일본 동네는 sublocality, 주/도는 administrative_area_level_1.
 */
export function mapGoogleComponents(components: GoogleComponent[], fallbackCountry: string): IntlAddress {
    const pick = (types: string[], short = false): string => {
        for (const type of types) {
            const found = components.find((c) => c.types?.includes(type));

            if (found) {
                return (short ? found.shortText : found.longText) ?? found.longText ?? '';
            }
        }

        return '';
    };

    const countryCode = (pick(['country'], true) || fallbackCountry).toUpperCase();
    const streetNumber = pick(['street_number']);
    const route = pick(['route']);
    const premise = pick(['premise']);
    const sublocality = pick(['sublocality_level_1', 'sublocality', 'neighborhood']);
    // 미국식(번지 거리)과 유럽식(거리 번지)을 다 맞출 수 없어 영어권 순서를 쓰고, 거리 정보가 없으면 건물·동네로 채운다
    const street = [streetNumber, route].filter(Boolean).join(' ');
    const address = emptyAddress(countryCode);

    address.addressLine1 = street || premise || sublocality;
    address.addressLine2 = [street ? premise : '', pick(['subpremise'])].filter(Boolean).join(' ');
    address.city = pick(['locality', 'postal_town', 'administrative_area_level_2']);
    address.state = pick(['administrative_area_level_1'], ['US', 'CA', 'AU'].includes(countryCode));
    address.postalCode = pick(['postal_code']);

    if (address.city === '' && sublocality !== '' && address.addressLine1 !== sublocality) {
        address.city = sublocality;
    }

    return address;
}

/**
 * Google 제공자를 만듭니다.
 *
 * @param apiKey Places API (New) 를 사용 설정한 키
 * @param language 결과 언어
 */
export function createGoogleProvider(apiKey: string, language: string): AddressProvider {
    let sessionToken = newSessionToken();

    return {
        id: 'google',

        async search(query, countryCode, signal) {
            const body = {
                input: query,
                includedRegionCodes: [countryCode.toLowerCase()],
                languageCode: language,
                sessionToken,
            };
            const json = await fetchJson(AUTOCOMPLETE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
                body: JSON.stringify(body),
                signal,
            });

            return (json?.suggestions ?? [])
                .map((s: any) => s.placePrediction)
                .filter(Boolean)
                .map((p: any): Suggestion => ({
                    id: p.placeId,
                    label: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
                    description: p.structuredFormat?.secondaryText?.text ?? '',
                    _raw: p,
                }));
        },

        async retrieve(suggestion, countryCode, signal) {
            const url = `${DETAILS_URL}${encodeURIComponent(suggestion.id)}?sessionToken=${encodeURIComponent(sessionToken)}&languageCode=${encodeURIComponent(language)}`;
            const json = await fetchJson(url, {
                headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'addressComponents,formattedAddress' },
                signal,
            });

            // 상세 조회로 세션이 끝난다 — 다음 검색은 새 세션
            sessionToken = newSessionToken();

            return { address: mapGoogleComponents(json?.addressComponents ?? [], countryCode), raw: json };
        },
    };
}
