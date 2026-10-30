import { afterEach, describe, expect, it, vi } from 'vitest';
import { openAddressDialog } from '../ui/dialog';
import type { AddressProvider } from '../types';

const countries = [{ code: 'US', name: 'United States' }, { code: 'JP', name: 'Japan' }, { code: 'GB', name: 'United Kingdom' }];

const q = <T extends Element = HTMLElement>(selector: string): T => document.querySelector(selector) as T;
const type = (input: HTMLInputElement | HTMLSelectElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
};
const field = (name: string) => q<HTMLInputElement>(`.g7ia-dialog [name="${name}"]`);
const apply = () => (document.querySelectorAll('.g7ia-foot button')[1] as HTMLButtonElement).click();

afterEach(() => {
    document.body.replaceChildren();
    vi.useRealTimers();
});

describe('해외 주소 입력 창', () => {
    it('필수 칸이 비면 적용되지 않고 오류를 보인다', async () => {
        const pending = openAddressDialog({ countries, initialCountry: 'US', provider: null, themeColor: '#1D4ED8' });
        apply();

        expect(q('.g7ia-overlay')).not.toBeNull();
        expect(field('address_line_1').getAttribute('aria-invalid')).toBe('true');
        expect(field('intl_state').tagName).toBe('SELECT');

        (document.querySelector('.g7ia-close') as HTMLButtonElement).click();
        await expect(pending).resolves.toBeNull();
    });

    it('직접 입력해 적용하면 정리된 주소를 돌려준다', async () => {
        const pending = openAddressDialog({ countries, initialCountry: 'US', provider: null, themeColor: '#1D4ED8' });
        type(field('address_line_1'), ' 1 Main  St ');
        type(field('intl_city'), 'Austin');
        type(field('intl_state'), 'TX');
        type(field('intl_postal_code'), '78701');
        expect(q('.g7ia-preview').textContent).toContain('1 Main St, Austin, TX 78701');
        apply();

        await expect(pending).resolves.toEqual({
            address: { countryCode: 'US', addressLine1: '1 Main St', addressLine2: '', city: 'Austin', state: 'TX', postalCode: '78701' },
            provider: 'manual',
            raw: null,
        });
        expect(q('.g7ia-overlay')).toBeNull();
    });

    it('국가를 바꾸면 칸을 비우고 주/도 칸 모양을 바꾼다', async () => {
        const pending = openAddressDialog({ countries, initialCountry: 'US', provider: null, themeColor: '#1D4ED8' });
        type(field('address_line_1'), '1 Main St');
        type(q<HTMLSelectElement>('.g7ia-dialog [name="country_code"]'), 'GB');

        expect(field('address_line_1').value).toBe('');
        expect(field('intl_state').tagName).toBe('INPUT');
        expect(field('intl_postal_code').placeholder).toContain('SW1A 1AA');

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        await expect(pending).resolves.toBeNull();
    });

    it('자동완성 후보를 고르면 칸을 채우고 제공자 이름을 돌려준다', async () => {
        vi.useFakeTimers();
        const provider: AddressProvider = {
            id: 'fake',
            search: vi.fn().mockResolvedValue([{ id: '1', label: '1 Main St', description: 'Austin, TX' }]),
            retrieve: vi.fn().mockResolvedValue({ address: { countryCode: 'US', addressLine1: '1 Main St', addressLine2: '', city: 'Austin', state: 'Texas', postalCode: '78701' }, raw: { ok: 1 } }),
        };
        const pending = openAddressDialog({ countries, initialCountry: 'US', provider, themeColor: '#1D4ED8' });
        const search = q<HTMLInputElement>('.g7ia-dialog [role="combobox"]');
        search.value = '1 main';
        search.dispatchEvent(new Event('input'));
        await vi.advanceTimersByTimeAsync(300);

        const option = q('.g7ia-option');
        expect(option.textContent).toContain('1 Main St');
        option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        await vi.runOnlyPendingTimersAsync();

        // 주 이름(Texas)을 선택지 코드(TX)로 맞춘다
        expect(field('intl_state').value).toBe('TX');
        apply();
        await expect(pending).resolves.toMatchObject({ provider: 'fake', raw: { ok: 1 }, address: { state: 'TX', city: 'Austin' } });
    });

    it('제공자가 실패하면 안내를 띄우고 직접 입력은 그대로 된다', async () => {
        vi.useFakeTimers();
        const provider: AddressProvider = { id: 'fake', search: vi.fn().mockRejectedValue(new Error('down')), retrieve: vi.fn() };
        const pending = openAddressDialog({ countries, initialCountry: 'JP', provider, themeColor: '#1D4ED8' });
        const search = q<HTMLInputElement>('.g7ia-dialog [role="combobox"]');
        search.value = 'tokyo';
        search.dispatchEvent(new Event('input'));
        await vi.advanceTimersByTimeAsync(300);

        expect(q('.g7ia-notice').hidden).toBe(false);
        type(field('address_line_1'), '1-1 Chiyoda');
        type(field('intl_city'), 'Chiyoda-ku');
        type(field('intl_state'), 'Tokyo');
        type(field('intl_postal_code'), '100-0001');
        apply();
        await expect(pending).resolves.toMatchObject({ provider: 'manual', address: { countryCode: 'JP', state: 'Tokyo' } });
    });
});
