import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSetStateAction, resolveIntlTarget } from '../core/presets';
import type { DialogOptions } from '../ui/dialog';

const dialogMock = vi.fn();
vi.mock('../ui/dialog', () => ({ openAddressDialog: (options: DialogOptions) => dialogMock(options) }));

const { openIntlAddressHandler } = await import('../handlers/openIntlAddress');

const address = { countryCode: 'US', addressLine1: '1 Main St', addressLine2: 'Apt 2', city: 'Austin', state: 'TX', postalCode: '78701' };

let dispatch: ReturnType<typeof vi.fn>;
let warning: ReturnType<typeof vi.fn>;

beforeEach(() => {
    dispatch = vi.fn();
    warning = vi.fn();
    (window as any).G7Core = { dispatch, toast: { warning }, state: { getLocal: () => ({}) } };
    (window as any).G7Config = { plugins: { 'community-intl_address': { allowed_countries: '', exclude_kr: true } } };
    dialogMock.mockReset();
    dialogMock.mockResolvedValue({ address, provider: 'manual', raw: null });
});

afterEach(() => {
    delete (window as any).G7Core;
    delete (window as any).G7Config;
});

describe('presets', () => {
    it('주문서 프리셋은 shipping.* 해외 칸과 checkout.country_code 를 쓴다', () => {
        expect(buildSetStateAction(resolveIntlTarget('checkout')!, address)).toEqual({
            handler: 'setState',
            params: {
                target: 'local',
                'shipping.country_code': 'US',
                'shipping.address_line_1': '1 Main St',
                'shipping.address_line_2': 'Apt 2',
                'shipping.intl_city': 'Austin',
                'shipping.intl_state': 'TX',
                'shipping.intl_postal_code': '78701',
                'checkout.country_code': 'US',
            },
        });
    });

    it('관리자 주문 상세는 recipient_country_code 를 쓴다', () => {
        const params = buildSetStateAction(resolveIntlTarget('admin_order')!, address).params;
        expect(params['form.recipient_country_code']).toBe('US');
        expect(params['form.address_line_1']).toBe('1 Main St');
        expect(params.target).toBe('local');
    });

    it('객체 intlTarget 을 받고, 잘못된 값은 null', () => {
        expect(resolveIntlTarget({ target: 'global', prefix: 'x.' })).toMatchObject({ target: 'global', prefix: 'x.', clearDomestic: true });
        expect(resolveIntlTarget({ target: 'nope', prefix: 'x.' })).toBeNull();
        expect(resolveIntlTarget('')).toBeNull();
        expect(resolveIntlTarget('unknown')).toBeNull();
    });
});

describe('openIntlAddress', () => {
    const callback = { handler: 'setState', params: { target: 'local', 'shipping.zipcode': '{{$event.zipcode}}' } };

    it('해외 칸을 먼저 쓰고 콜백을 표준 이벤트로 실행한다', async () => {
        await openIntlAddressHandler({ handler: 'x', params: { intlTarget: 'checkout', callbackAction: callback, countries: ['US', 'JP'] } }, { state: { checkout: {} } });

        expect(dispatch).toHaveBeenCalledTimes(2);
        expect(dispatch.mock.calls[0][0].params['shipping.country_code']).toBe('US');
        expect(dispatch.mock.calls[1][0]).toBe(callback);
        const event = dispatch.mock.calls[1][1].componentContext.data.$event;
        expect(event).toMatchObject({ countryCode: 'US', zipcode: '', address: '', postalCode: '78701', addressLine1: '1 Main St' });
    });

    it('해외 칸이 없는 화면은 콜백만 실행하고 zipcode·address 를 채운다', async () => {
        await openIntlAddressHandler({ handler: 'x', params: { intlTarget: '', callbackAction: callback } }, {});

        expect(dispatch).toHaveBeenCalledTimes(1);
        const event = dispatch.mock.calls[0][1].componentContext.data.$event;
        expect(event.zipcode).toBe('78701');
        expect(event.address).toContain('1 Main St');
    });

    it('이커머스 배송 국가와 설정 허용 국가가 겹치는 국가만 보여 주고 대한민국은 뺀다', async () => {
        (window as any).G7Config.plugins['community-intl_address'].allowed_countries = 'US,JP,KR,CN';
        await openIntlAddressHandler({ handler: 'x', params: { intlTarget: 'checkout', countries: ['KR', 'JP', 'US', 'DE'] } }, {});

        const options: DialogOptions = dialogMock.mock.calls[0][0];
        expect(options.countries.map((c) => c.code).sort()).toEqual(['JP', 'US']);
    });

    it('고를 국가가 없으면 창을 열지 않고 안내한다', async () => {
        await openIntlAddressHandler({ handler: 'x', params: { intlTarget: 'checkout', countries: ['KR'] } }, {});

        expect(dialogMock).not.toHaveBeenCalled();
        expect(warning).toHaveBeenCalledOnce();
    });

    it('창을 닫으면 아무것도 쓰지 않는다', async () => {
        dialogMock.mockResolvedValue(null);
        await openIntlAddressHandler({ handler: 'x', params: { intlTarget: 'checkout', callbackAction: callback } }, {});

        expect(dispatch).not.toHaveBeenCalled();
    });

    it('콜백도 대상도 없으면 targetFields 로 로컬 상태에 쓴다', async () => {
        const setLocal = vi.fn();
        (window as any).G7Core.state.setLocal = setLocal;
        await openIntlAddressHandler({ handler: 'x', params: { targetFields: { zipcode: 'f.zip', address: 'f.addr', countryCode: 'f.cc' } } }, {});

        expect(setLocal).toHaveBeenCalledWith({ 'f.zip': '78701', 'f.addr': expect.stringContaining('Austin'), 'f.cc': 'US' });
    });

    it('기본 국가 설정이 목록에 있으면 그 국가로 연다', async () => {
        (window as any).G7Config.plugins['community-intl_address'].default_country = 'jp';
        await openIntlAddressHandler({ handler: 'x', params: {} }, {});

        expect(dialogMock.mock.calls[0][0].initialCountry).toBe('JP');
    });
});
