/**
 * G7Core 접근 — 번역·설정·로거·화면 언어
 *
 * G7Core 가 아직 없거나 일부 기능이 없는 환경(테스트·초기화 전)에서도 동작하도록 모든 접근에 폴백을 둔다.
 *
 * @module runtime
 */

import type { IntlAddressSettings } from '../types';
import { isCountryCode } from './countries';

/** 플러그인 식별자 */
export const PLUGIN_IDENTIFIER = 'community-intl_address';

/** 설정 기본값 — config/settings/defaults.json 과 같다 */
export const DEFAULT_SETTINGS: IntlAddressSettings = {
    provider: 'none',
    google_api_key: '',
    loqate_api_key: '',
    geoapify_api_key: '',
    default_country: 'US',
    allowed_countries: '',
    exclude_kr: true,
    theme_color: '#1D4ED8',
};

const g7 = (): any => (typeof window !== 'undefined' ? (window as any).G7Core : undefined);

/**
 * 로거를 만듭니다.
 */
export function createLogger(scope: string): { log: (...a: unknown[]) => void; warn: (...a: unknown[]) => void; error: (...a: unknown[]) => void } {
    const name = `IntlAddress:${scope}`;

    return g7()?.createLogger?.(name) ?? {
        log: (...args: unknown[]) => console.log(`[${name}]`, ...args),
        warn: (...args: unknown[]) => console.warn(`[${name}]`, ...args),
        error: (...args: unknown[]) => console.error(`[${name}]`, ...args),
    };
}

/**
 * 번역 문자열을 얻습니다. {name} 자리표시를 replacements 로 채웁니다.
 *
 * @param key 번역 키 (플러그인 네임스페이스 이하)
 * @param fallback 번역 엔진 부재 시 문구
 */
export function t(key: string, fallback: string, replacements: Record<string, string> = {}): string {
    const translate = g7()?.t;
    const full = `${PLUGIN_IDENTIFIER}.${key}`;
    let text = fallback;

    if (typeof translate === 'function') {
        const result = translate(full);

        if (typeof result === 'string' && result !== full) {
            text = result;
        }
    }

    return Object.entries(replacements).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v), text);
}

/**
 * 화면 언어를 돌려줍니다 (예: 'ko', 'en').
 */
export function currentLocale(): string {
    const fromCore = g7()?.locale?.current?.() ?? g7()?.getLocale?.();
    const fromDoc = typeof document !== 'undefined' ? document.documentElement.lang : '';

    return String(fromCore || fromDoc || 'ko').split(/[-_]/)[0] || 'ko';
}

/**
 * 플러그인 설정을 읽어 기본값과 합칩니다. 핸들러 매개변수로 받은 값이 있으면 그것이 우선합니다.
 */
export function readSettings(overrides: Partial<IntlAddressSettings> = {}): IntlAddressSettings {
    const fromCore = g7()?.plugin?.getSettings?.(PLUGIN_IDENTIFIER) ?? (typeof window !== 'undefined' ? (window as any).G7Config?.plugins?.[PLUGIN_IDENTIFIER] : undefined) ?? {};
    const merged: Record<string, any> = { ...DEFAULT_SETTINGS };

    [fromCore, overrides].forEach((source) => {
        Object.entries(source ?? {}).forEach(([key, value]) => {
            if (key in DEFAULT_SETTINGS && value !== undefined && value !== null) {
                merged[key] = value;
            }
        });
    });

    if (!['none', 'google', 'loqate', 'geoapify'].includes(merged.provider)) {
        merged.provider = 'none';
    }
    merged.exclude_kr = merged.exclude_kr === true || merged.exclude_kr === 'true' || merged.exclude_kr === 1 || merged.exclude_kr === '1';
    merged.default_country = isCountryCode(merged.default_country) ? String(merged.default_country).toUpperCase() : DEFAULT_SETTINGS.default_country;
    merged.theme_color = /^#[0-9a-f]{6}$/i.test(String(merged.theme_color)) ? merged.theme_color : DEFAULT_SETTINGS.theme_color;

    return merged as IntlAddressSettings;
}

/**
 * 액션 하나를 G7Core.dispatch 로 실행합니다.
 *
 * componentContext 를 명시해 비동기(모달 확정) 시점에도 버튼 클릭 시점 컴포넌트 상태로 실행되게 한다 —
 * Daum 우편번호 플러그인의 executeCallbackAction 과 같은 방식.
 */
export function dispatchAction(action: unknown, componentContext: Record<string, any>): void {
    const core = g7();

    if (!core?.dispatch) {
        throw new Error('G7Core.dispatch not available');
    }

    const actions = Array.isArray(action) ? action : [action];

    actions.forEach((item) => {
        if (item && typeof item === 'object') {
            core.dispatch(item, { componentContext });
        }
    });
}
