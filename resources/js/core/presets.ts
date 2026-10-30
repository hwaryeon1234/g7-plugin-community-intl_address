/**
 * 호스트 폼에 해외 주소를 써 넣는 대상(IntlTarget) 해석
 *
 * address_search_slot 을 여는 화면 중 해외 주소 칸을 따로 가진 곳(이커머스 4곳)은 국내 콜백만으로는
 * 해외 칸이 채워지지 않는다 — 콜백이 zipcode·address 만 쓰기 때문이다. 그래서 그 화면의 상태 경로를
 * 프리셋으로 들고 있다가, 주소를 확정하면 해외 칸과 국가를 먼저 쓰고 콜백을 실행한다.
 *
 * 프리셋 이름은 조각(intl-address-search.g7.html)이 화면 상태를 보고 고른다. 확장점을 여는 쪽이
 * extensionPointProps.intlTarget 으로 객체를 넘기면 그것이 우선한다 — 새 화면은 그렇게 붙는다.
 *
 * @module presets
 */

import type { IntlAddress, IntlTarget } from '../types';

/** 이커머스 해외 주소 칸 이름 (배송지·주문서·주문 상세 공통) */
export const ECOMMERCE_FIELDS: Readonly<Record<keyof IntlAddress, string>> = {
    countryCode: 'country_code',
    addressLine1: 'address_line_1',
    addressLine2: 'address_line_2',
    city: 'intl_city',
    state: 'intl_state',
    postalCode: 'intl_postal_code',
};

/** 내장 프리셋 */
export const PRESETS: Readonly<Record<string, IntlTarget>> = {
    /** 주문서 배송지 (shop/_checkout_shipping) — 배송비 재계산용 checkout.country_code 도 함께 */
    checkout: {
        target: 'local',
        prefix: 'shipping.',
        mirror: { 'checkout.country_code': 'countryCode' },
        clearDomestic: true,
    },
    /** 주문서의 배송지 관리 모달 (shop/_modal_address_manage) */
    checkout_modal: {
        target: 'global',
        prefix: 'checkoutAddressModal.editing.',
        clearDomestic: true,
    },
    /** 마이페이지 배송지 추가·수정 모달 (mypage/addresses/_modal_address) */
    user_address: {
        target: 'global',
        prefix: 'editingAddress.',
        clearDomestic: true,
    },
    /** 관리자 주문 상세 수령인 정보 (admin_ecommerce_order_detail/_partial_order_info) */
    admin_order: {
        target: 'local',
        prefix: 'form.',
        fields: { countryCode: 'recipient_country_code' },
        clearDomestic: true,
    },
};

/** 이커머스 배송 국가 목록을 따라야 하는 프리셋 */
export const ECOMMERCE_PRESETS: ReadonlyArray<string> = ['checkout', 'checkout_modal', 'user_address', 'admin_order'];

/**
 * 프리셋 이름 또는 객체를 IntlTarget 으로 해석합니다.
 *
 * @param value 프리셋 이름 · IntlTarget 객체 · 빈 값
 * @return IntlTarget|null 해외 칸이 없는 화면이면 null
 */
export function resolveIntlTarget(value: unknown): IntlTarget | null {
    if (typeof value === 'string') {
        return PRESETS[value] ?? null;
    }

    if (value && typeof value === 'object') {
        const candidate = value as Partial<IntlTarget>;

        if ((candidate.target === 'local' || candidate.target === 'global') && typeof candidate.prefix === 'string') {
            return {
                target: candidate.target,
                prefix: candidate.prefix,
                fields: candidate.fields,
                mirror: candidate.mirror,
                clearDomestic: candidate.clearDomestic ?? true,
            };
        }
    }

    return null;
}

/**
 * IntlTarget 과 주소로 setState 액션 하나를 만듭니다.
 *
 * 값은 이미 확정된 문자열이라 표현식({{ }}) 없이 그대로 넣는다.
 *
 * @return object G7 액션 (handler: setState)
 */
export function buildSetStateAction(target: IntlTarget, address: IntlAddress): { handler: 'setState'; params: Record<string, string> } {
    const params: Record<string, string> = { target: target.target };
    const fields = { ...ECOMMERCE_FIELDS, ...(target.fields ?? {}) };

    (Object.keys(ECOMMERCE_FIELDS) as Array<keyof IntlAddress>).forEach((key) => {
        params[`${target.prefix}${fields[key]}`] = address[key];
    });

    Object.entries(target.mirror ?? {}).forEach(([path, key]) => {
        params[path] = address[key];
    });

    return { handler: 'setState', params };
}
