/**
 * openIntlAddress 핸들러
 *
 * 해외 주소 입력 창을 열고, 확정된 주소를 호스트 화면에 넘긴다.
 *
 * 넘기는 순서:
 * 1. intlTarget 이 있으면(해외 칸을 가진 화면) 그 칸과 국가를 먼저 setState 로 쓴다
 * 2. callbackAction(확장점의 onAddressSelect)이 있으면 표준 이벤트로 실행한다
 *    — 이커머스 주문서 콜백은 여기서 배송비를 다시 계산하므로, 국가가 먼저 써져 있어야 한다
 * 3. 둘 다 없으면 targetFields 매핑으로 로컬 상태에 쓴다 (Daum 우편번호 플러그인의 기본 동작과 같음)
 *
 * 표준 이벤트 필드(zipcode·address·region·city·countryCode)는 Daum 우편번호와 같은 이름이라
 * address_search_slot 콜백을 고치지 않고도 받는다. 해외 확장 필드는 addressLine1·addressLine2·state·
 * postalCode·formatted 로 더 실린다.
 */

import type { ActionContext, IntlAddress, IntlAddressSettings } from '../types';
import { listCountries, parseCountryList } from '../core/countries';
import { toG7Event } from '../core/address';
import { buildSetStateAction, ECOMMERCE_PRESETS, resolveIntlTarget } from '../core/presets';
import { createLogger, currentLocale, dispatchAction, readSettings, t } from '../core/runtime';
import { createProvider } from '../providers';
import { openAddressDialog } from '../ui/dialog';

const logger = createLogger('OpenIntlAddress');

interface OpenIntlAddressAction {
    handler: string;
    params?: {
        /** 주소 확정 시 실행할 콜백 액션 (확장점 onAddressSelect) */
        callbackAction?: unknown;
        /** 해외 칸을 쓸 대상 — 프리셋 이름 또는 IntlTarget 객체 */
        intlTarget?: unknown;
        /** 화면이 허용하는 국가 (예: 이커머스 배송 가능 국가). 설정의 허용 국가와 겹치는 것만 남는다 */
        countries?: unknown;
        /** 처음 선택할 국가 */
        defaultCountry?: string;
        /** 창에 미리 채울 주소 (수정 화면) */
        initial?: Partial<IntlAddress> | null;
        /** 콜백·intlTarget 이 없을 때 쓸 로컬 상태 경로 */
        targetFields?: Record<string, string>;
        /** 설정 덮어쓰기 (provider · theme_color 등) */
        settings?: Partial<IntlAddressSettings>;
    };
    [key: string]: any;
}

/**
 * 창에 보일 국가 목록을 정합니다.
 */
function resolveCountries(settings: IntlAddressSettings, hostCountries: unknown, ecommerceHost: boolean, locale: string) {
    const fromSettings = parseCountryList(settings.allowed_countries);
    const fromHost = hostCountries === undefined || hostCountries === null || hostCountries === '' ? null : parseCountryList(hostCountries);
    let allowed: string[] | null = fromSettings.length > 0 ? fromSettings : null;

    if (fromHost !== null) {
        allowed = allowed === null ? fromHost : allowed.filter((c) => fromHost.includes(c));
        // 이커머스 화면이 허용 국가를 줬는데 겹치는 국가가 없다 — 빈 목록이 맞다(전체로 되돌리지 않음)
        if (allowed.length === 0) {
            return [];
        }
    } else if (ecommerceHost) {
        logger.warn('ecommerce host without shipping countries — falling back to settings');
    }

    return listCountries({ allowed, exclude: settings.exclude_kr ? ['KR'] : [], locale });
}

/**
 * 해외 주소 입력 창을 열고 결과를 호스트에 넘깁니다.
 */
export async function openIntlAddressHandler(action: OpenIntlAddressAction, context: ActionContext): Promise<void> {
    const params = action.params ?? {};
    const settings = readSettings(params.settings ?? {});
    const locale = currentLocale();
    const intlTarget = resolveIntlTarget(params.intlTarget);
    const ecommerceHost = typeof params.intlTarget === 'string' && ECOMMERCE_PRESETS.includes(params.intlTarget);
    const countries = resolveCountries(settings, params.countries, ecommerceHost, locale);

    if (countries.length === 0) {
        (window as any).G7Core?.toast?.warning?.(t('errors.no_countries', '주소를 입력할 수 있는 국가가 없습니다. 관리자 설정을 확인해 주세요.'));
        logger.warn('no selectable countries', { settings, hostCountries: params.countries });

        return;
    }

    const preferred = String(params.initial?.countryCode || params.defaultCountry || settings.default_country).toUpperCase();
    const initialCountry = countries.some((c) => c.code === preferred) ? preferred : countries[0].code;

    const result = await openAddressDialog({
        countries,
        initialCountry,
        initial: params.initial?.countryCode === initialCountry ? params.initial : null,
        provider: createProvider(settings, locale),
        themeColor: settings.theme_color,
    });

    if (!result) {
        return;
    }

    const event = toG7Event(result.address, { provider: result.provider, raw: result.raw, clearDomestic: intlTarget?.clearDomestic ?? false });
    logger.log('address selected', event);

    // 버튼 클릭 시점의 컴포넌트 상태로 실행한다 — 창이 떠 있는 동안 컨텍스트가 바뀌어도 원래 화면에 쓴다
    const currentLocalState = context?.state ?? (window as any).G7Core?.state?.getLocal?.() ?? {};
    const componentContext = {
        state: currentLocalState,
        setState: context?.setState,
        data: { ...(context?.data ?? {}), _local: currentLocalState, $event: event },
        isolatedContext: context?.isolatedContext,
    };

    try {
        if (intlTarget) {
            dispatchAction(buildSetStateAction(intlTarget, result.address), componentContext);
        }

        if (params.callbackAction) {
            dispatchAction(params.callbackAction, componentContext);
        } else if (!intlTarget) {
            writeTargetFields(params.targetFields, event);
        }
    } catch (error) {
        logger.error('failed to deliver address', error);
    }
}

/**
 * 콜백이 없는 화면의 기본 동작 — targetFields 매핑대로 로컬 상태에 씁니다.
 */
function writeTargetFields(targetFields: Record<string, string> | undefined, event: Record<string, any>): void {
    const setLocal = (window as any).G7Core?.state?.setLocal;

    if (!targetFields || typeof setLocal !== 'function') {
        logger.warn('no callbackAction, intlTarget or targetFields — nothing to write');

        return;
    }

    const updates: Record<string, unknown> = {};
    Object.entries(targetFields).forEach(([eventKey, path]) => {
        if (typeof path === 'string' && path !== '' && eventKey in event) {
            updates[path] = event[eventKey];
        }
    });
    setLocal(updates);
}
