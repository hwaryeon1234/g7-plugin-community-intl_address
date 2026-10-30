/**
 * 자동완성 제공자 선택
 *
 * 새 제공자는 AddressProvider 계약(search · retrieve)을 구현하고 여기 factories 에 더한다.
 * 설정 스키마 provider 선택지(plugin.php)와 키 필드도 함께 늘린다.
 *
 * @module providers
 */

import type { AddressProvider, IntlAddressSettings } from '../types';
import { createGeoapifyProvider } from './geoapify';
import { createGoogleProvider } from './google';
import { createLoqateProvider } from './loqate';

const factories: Record<string, { key: keyof IntlAddressSettings; create: (apiKey: string, language: string) => AddressProvider }> = {
    google: { key: 'google_api_key', create: createGoogleProvider },
    loqate: { key: 'loqate_api_key', create: createLoqateProvider },
    geoapify: { key: 'geoapify_api_key', create: createGeoapifyProvider },
};

/**
 * 설정으로 제공자를 만듭니다. 「사용 안 함」이거나 키가 비어 있으면 null — 화면은 직접 입력만 보여 준다.
 */
export function createProvider(settings: IntlAddressSettings, language: string): AddressProvider | null {
    const factory = factories[settings.provider];

    if (!factory) {
        return null;
    }

    const apiKey = String(settings[factory.key] ?? '').trim();

    return apiKey === '' ? null : factory.create(apiKey, language);
}

export { ProviderError } from './http';
