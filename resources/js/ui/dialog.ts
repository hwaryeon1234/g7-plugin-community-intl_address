/**
 * 해외 주소 입력 창
 *
 * 레이아웃이 아니라 DOM 으로 직접 그린다 — Daum 우편번호 레이어와 같은 방식이라 어느 화면(관리자·사용자
 * 템플릿, 모달 안)에서 열려도 호스트 레이아웃·Tailwind 빌드에 기대지 않는다. 스타일은 이 창 전용
 * 접두어(g7ia-)로 한 번만 넣는다.
 *
 * 자동완성은 거들 뿐이다. 제공자가 없거나 실패해도 같은 칸에 직접 입력해 확정할 수 있어야 한다 —
 * 외부 서비스가 막혀도 주문을 끝낼 수 있게.
 *
 * @module ui/dialog
 */

import type { AddressProvider, IntlAddress, Suggestion } from '../types';
import { getCountryFormat } from '../core/countries';
import { emptyAddress, formatOneLine, normalizeAddress, validateAddress, type AddressErrors } from '../core/address';
import { createLogger, t } from '../core/runtime';

const logger = createLogger('Dialog');

const STYLE_ID = 'g7ia-style';
const MIN_QUERY = 3;
const DEBOUNCE_MS = 250;

export interface DialogOptions {
    countries: Array<{ code: string; name: string }>;
    initialCountry: string;
    initial?: Partial<IntlAddress> | null;
    provider: AddressProvider | null;
    themeColor: string;
}

export interface DialogResult {
    address: IntlAddress;
    provider: string;
    raw: unknown;
}

/**
 * 창 전용 스타일을 한 번 넣습니다. 강조색은 --g7ia-accent 로 받습니다.
 */
function ensureStyle(): void {
    if (document.getElementById(STYLE_ID)) {
        return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
.g7ia-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
.g7ia-dialog{--bg:#fff;--fg:#111827;--muted:#6b7280;--line:#d1d5db;--field:#fff;--hover:#f3f4f6;--danger:#dc2626;
 background:var(--bg);color:var(--fg);width:100%;max-width:520px;max-height:calc(100vh - 32px);overflow:auto;border-radius:12px;
 box-shadow:0 25px 50px -12px rgba(0,0,0,.25);font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;box-sizing:border-box}
.g7ia-dark .g7ia-dialog,.g7ia-dialog.g7ia-dark{--bg:#1f2937;--fg:#f9fafb;--muted:#9ca3af;--line:#4b5563;--field:#374151;--hover:#374151;--danger:#f87171}
.g7ia-dialog *{box-sizing:border-box}
.g7ia-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--line)}
.g7ia-title{margin:0;font-size:16px;font-weight:600}
.g7ia-close{background:none;border:0;color:var(--muted);font-size:22px;line-height:1;cursor:pointer;padding:4px 8px;border-radius:6px}
.g7ia-close:hover{background:var(--hover)}
.g7ia-body{padding:16px 20px;display:grid;gap:12px}
.g7ia-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (max-width:480px){.g7ia-row{grid-template-columns:1fr}}
.g7ia-label{display:block;font-size:13px;font-weight:500;margin-bottom:4px}
.g7ia-req{color:var(--danger);margin-left:2px}
.g7ia-input{width:100%;padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--field);color:var(--fg);font:inherit}
.g7ia-input:focus{outline:2px solid var(--g7ia-accent);outline-offset:-1px;border-color:transparent}
.g7ia-input[aria-invalid=true]{border-color:var(--danger)}
.g7ia-error{display:block;color:var(--danger);font-size:12px;margin-top:4px}
.g7ia-hint{color:var(--muted);font-size:12px;margin:4px 0 0}
.g7ia-search{position:relative}
.g7ia-list{position:absolute;left:0;right:0;top:100%;margin:4px 0 0;padding:4px;list-style:none;background:var(--bg);border:1px solid var(--line);border-radius:8px;
 box-shadow:0 10px 15px -3px rgba(0,0,0,.15);max-height:240px;overflow:auto;z-index:1}
.g7ia-option{padding:8px 10px;border-radius:6px;cursor:pointer}
.g7ia-option[aria-selected=true],.g7ia-option:hover{background:var(--hover)}
.g7ia-option small{display:block;color:var(--muted);font-size:12px}
.g7ia-notice{padding:8px 12px;border-radius:8px;background:rgba(245,158,11,.12);color:inherit;font-size:13px}
.g7ia-preview{padding:10px 12px;border-radius:8px;background:var(--hover);font-size:13px;word-break:break-word}
.g7ia-foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 20px 16px;border-top:1px solid var(--line)}
.g7ia-btn{padding:8px 16px;border-radius:8px;border:1px solid var(--line);background:var(--field);color:var(--fg);font:inherit;font-weight:500;cursor:pointer}
.g7ia-btn:hover{background:var(--hover)}
.g7ia-btn-primary{background:var(--g7ia-accent);border-color:var(--g7ia-accent);color:#fff}
.g7ia-btn-primary:hover{background:var(--g7ia-accent);filter:brightness(1.1)}
`;
    document.head.appendChild(style);
}

/** 주/도 칸 이름 (국가 형식 stateLabel 별) */
function stateLabel(kind: string): string {
    const fallbacks: Record<string, string> = {
        state: '주 (State)', province: '주/도 (Province)', prefecture: '도도부현 (Prefecture)',
        region: '지역 (Region)', county: '카운티 (County)', emirate: '토후국 (Emirate)',
    };

    return t(`dialog.state_label.${kind}`, fallbacks[kind] ?? fallbacks.region);
}

/** 오류 코드 문구 */
function errorText(code: string, example?: string): string {
    switch (code) {
        case 'required':
            return t('errors.required', '필수 입력 항목입니다.');
        case 'invalid_postal':
            return example
                ? t('errors.invalid_postal_example', '우편번호 형식이 올바르지 않습니다. (예: {example})', { example })
                : t('errors.invalid_postal', '우편번호 형식이 올바르지 않습니다.');
        case 'too_long':
            return t('errors.too_long', '너무 깁니다.');
        default:
            return t('errors.invalid_country', '국가를 선택해 주세요.');
    }
}

/**
 * 작은 엘리먼트 생성기
 */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);

    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    if (text !== undefined) {
        node.textContent = text;
    }

    return node;
}

let uid = 0;

/**
 * 해외 주소 입력 창을 엽니다.
 *
 * @return Promise<DialogResult|null> 확정하면 주소, 닫으면 null
 */
export function openAddressDialog(options: DialogOptions): Promise<DialogResult | null> {
    ensureStyle();

    const id = `g7ia-${++uid}`;
    const previousFocus = document.activeElement as HTMLElement | null;
    const isDark = document.documentElement.classList.contains('dark');

    let address: IntlAddress = normalizeAddress({ ...emptyAddress(options.initialCountry), ...(options.initial ?? {}), countryCode: options.initial?.countryCode || options.initialCountry });
    let chosenProvider = 'manual';
    let chosenRaw: unknown = null;
    let providerBroken = false;
    let submitted = false;
    let errors: AddressErrors = {};

    const overlay = el('div', { class: 'g7ia-overlay' });
    const dialog = el('div', { class: `g7ia-dialog${isDark ? ' g7ia-dark' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': `${id}-title` });
    dialog.style.setProperty('--g7ia-accent', options.themeColor);

    // 머리
    const head = el('div', { class: 'g7ia-head' });
    head.append(el('h2', { class: 'g7ia-title', id: `${id}-title` }, t('dialog.title', '해외 주소 입력')));
    const closeBtn = el('button', { type: 'button', class: 'g7ia-close', 'aria-label': t('dialog.close', '닫기') }, '×');
    head.append(closeBtn);

    const body = el('div', { class: 'g7ia-body' });

    // 국가
    const countryWrap = el('div');
    countryWrap.append(el('label', { class: 'g7ia-label', for: `${id}-country` }, t('dialog.country', '국가')));
    const countrySelect = el('select', { id: `${id}-country`, class: 'g7ia-input', name: 'country_code' });
    options.countries.forEach((c) => {
        const opt = el('option', { value: c.code }, `${c.name} (${c.code})`);
        countrySelect.append(opt);
    });
    countrySelect.value = address.countryCode;
    countryWrap.append(countrySelect);
    body.append(countryWrap);

    // 자동완성 검색
    const searchWrap = el('div', { class: 'g7ia-search' });
    const searchInput = el('input', {
        id: `${id}-search`, class: 'g7ia-input', type: 'text', autocomplete: 'off', role: 'combobox',
        'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': `${id}-list`,
        placeholder: t('dialog.search_placeholder', '주소를 영문으로 입력하면 후보를 보여 줍니다'),
    });
    const list = el('ul', { id: `${id}-list`, class: 'g7ia-list', role: 'listbox', hidden: '' });
    const notice = el('div', { class: 'g7ia-notice', role: 'status', hidden: '' });
    if (options.provider) {
        searchWrap.append(el('label', { class: 'g7ia-label', for: `${id}-search` }, t('dialog.search', '주소 검색')), searchInput, list);
        body.append(searchWrap);
    }
    body.append(notice);

    // 입력 칸
    const inputs: Partial<Record<keyof IntlAddress, HTMLInputElement | HTMLSelectElement>> = {};
    const errorNodes: Partial<Record<keyof IntlAddress, HTMLElement>> = {};
    const labelNodes: Partial<Record<keyof IntlAddress, HTMLLabelElement>> = {};
    const fieldWraps: Partial<Record<keyof IntlAddress, HTMLElement>> = {};

    const makeField = (key: keyof IntlAddress, labelText: string, name: string, autocomplete: string): HTMLElement => {
        const wrap = el('div');
        const label = el('label', { class: 'g7ia-label', for: `${id}-${key}` }, labelText);
        const input = el('input', { id: `${id}-${key}`, class: 'g7ia-input', type: 'text', name, autocomplete, 'aria-describedby': `${id}-${key}-error` });
        const error = el('span', { id: `${id}-${key}-error`, class: 'g7ia-error', hidden: '' });
        wrap.append(label, input, error);
        inputs[key] = input;
        errorNodes[key] = error;
        labelNodes[key] = label;
        fieldWraps[key] = wrap;

        return wrap;
    };

    body.append(
        makeField('addressLine1', t('dialog.address_line_1', '주소 1 (번지·거리)'), 'address_line_1', 'address-line1'),
        makeField('addressLine2', t('dialog.address_line_2', '주소 2 (아파트·호수·건물, 선택)'), 'address_line_2', 'address-line2'),
    );
    const row1 = el('div', { class: 'g7ia-row' });
    row1.append(makeField('city', t('dialog.city', '도시 (City)'), 'intl_city', 'address-level2'), makeField('state', stateLabel('region'), 'intl_state', 'address-level1'));
    const row2 = el('div', { class: 'g7ia-row' });
    row2.append(makeField('postalCode', t('dialog.postal_code', '우편번호 (Postal code)'), 'intl_postal_code', 'postal-code'));
    body.append(row1, row2);

    const preview = el('div', { class: 'g7ia-preview', 'aria-live': 'polite' });
    body.append(preview);

    // 바닥
    const foot = el('div', { class: 'g7ia-foot' });
    const cancelBtn = el('button', { type: 'button', class: 'g7ia-btn' }, t('dialog.cancel', '취소'));
    const applyBtn = el('button', { type: 'button', class: 'g7ia-btn g7ia-btn-primary' }, t('dialog.apply', '적용'));
    foot.append(cancelBtn, applyBtn);

    dialog.append(head, body, foot);
    overlay.append(dialog);

    /** 국가 형식에 맞춰 주/도 칸·필수 표시·예시를 다시 그린다 */
    const applyCountryFormat = (): void => {
        const format = getCountryFormat(address.countryCode);
        const required: Partial<Record<keyof IntlAddress, boolean>> = {
            addressLine1: true,
            city: format.cityRequired,
            state: format.stateRequired,
            postalCode: format.postalRequired,
        };

        // 주/도: 선택지가 있으면 셀렉트, 없으면 입력칸
        const stateWrap = fieldWraps.state!;
        const old = inputs.state!;
        const next = format.states
            ? (() => {
                const select = el('select', { id: `${id}-state`, class: 'g7ia-input', name: 'intl_state', autocomplete: 'address-level1', 'aria-describedby': `${id}-state-error` });
                select.append(el('option', { value: '' }, t('dialog.select', '선택하세요')));
                format.states!.forEach(([code, name]) => select.append(el('option', { value: code }, code === name ? name : `${name} (${code})`)));
                return select;
            })()
            : el('input', { id: `${id}-state`, class: 'g7ia-input', type: 'text', name: 'intl_state', autocomplete: 'address-level1', 'aria-describedby': `${id}-state-error` });
        if (format.states && address.state && !format.states.some(([code]) => code === address.state)) {
            // 제공자가 이름으로 준 값을 코드로 맞춘다 (예: California → CA)
            const match = format.states.find(([, name]) => name.toLowerCase() === address.state.toLowerCase());
            address.state = match ? match[0] : '';
        }
        next.value = address.state;
        stateWrap.replaceChild(next, old);
        inputs.state = next;
        bindInput('state', next);

        (Object.keys(labelNodes) as Array<keyof IntlAddress>).forEach((key) => {
            const label = labelNodes[key]!;
            const base = key === 'state' ? stateLabel(format.stateLabel) : label.dataset.base ?? label.textContent ?? '';
            label.dataset.base = base;
            label.textContent = base;
            if (required[key]) {
                label.append(el('span', { class: 'g7ia-req', 'aria-hidden': 'true' }, '*'));
            }
            inputs[key]!.toggleAttribute('required', Boolean(required[key]));
        });

        inputs.postalCode!.setAttribute('placeholder', format.postalExample ? t('dialog.example', '예: {example}', { example: format.postalExample }) : '');
    };

    const renderErrors = (): void => {
        const format = getCountryFormat(address.countryCode);

        (Object.keys(errorNodes) as Array<keyof IntlAddress>).forEach((key) => {
            const code = submitted ? errors[key] : undefined;
            const node = errorNodes[key]!;
            node.hidden = !code;
            node.textContent = code ? errorText(code, key === 'postalCode' ? format.postalExample : undefined) : '';
            inputs[key]!.setAttribute('aria-invalid', code ? 'true' : 'false');
        });
    };

    const refresh = (): void => {
        errors = validateAddress(address);
        const line = formatOneLine(normalizeAddress(address));
        preview.textContent = line ? `${t('dialog.preview', '미리보기')}: ${line}` : '';
        preview.hidden = line === '';
        renderErrors();
    };

    function bindInput(key: keyof IntlAddress, input: HTMLInputElement | HTMLSelectElement): void {
        const handler = (): void => {
            address = { ...address, [key]: input.value };
            // 사람이 고친 순간부터는 제공자 결과가 아니다
            chosenProvider = 'manual';
            refresh();
        };
        input.addEventListener('input', handler);
        input.addEventListener('change', handler);
    }

    const fillInputs = (): void => {
        (['addressLine1', 'addressLine2', 'city', 'postalCode'] as const).forEach((key) => {
            inputs[key]!.value = address[key];
        });
        applyCountryFormat();
        refresh();
    };

    (['addressLine1', 'addressLine2', 'city', 'postalCode'] as const).forEach((key) => bindInput(key, inputs[key]!));

    countrySelect.addEventListener('change', () => {
        // 다른 나라 주소 조각이 남지 않게 비운다 (호스트 화면이 국가를 바꿀 때와 같은 동작)
        address = emptyAddress(countrySelect.value);
        chosenProvider = 'manual';
        chosenRaw = null;
        searchInput.value = '';
        closeList();
        fillInputs();
    });

    // ── 자동완성 ─────────────────────────────────────────────
    let suggestions: Suggestion[] = [];
    let activeIndex = -1;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inflight: AbortController | null = null;

    const showNotice = (text: string): void => {
        notice.textContent = text;
        notice.hidden = text === '';
    };

    const closeList = (): void => {
        list.hidden = true;
        list.replaceChildren();
        searchInput.setAttribute('aria-expanded', 'false');
        searchInput.removeAttribute('aria-activedescendant');
        suggestions = [];
        activeIndex = -1;
    };

    const setActive = (index: number): void => {
        activeIndex = index;
        Array.from(list.children).forEach((child, i) => child.setAttribute('aria-selected', i === index ? 'true' : 'false'));
        if (index >= 0) {
            searchInput.setAttribute('aria-activedescendant', `${id}-opt-${index}`);
            (list.children[index] as HTMLElement | undefined)?.scrollIntoView?.({ block: 'nearest' });
        }
    };

    const renderList = (): void => {
        list.replaceChildren();
        if (suggestions.length === 0) {
            closeList();
            showNotice(searchInput.value.trim().length >= MIN_QUERY ? t('dialog.no_results', '검색 결과가 없습니다. 아래 칸에 직접 입력해 주세요.') : '');
            return;
        }
        showNotice('');
        suggestions.forEach((s, i) => {
            const li = el('li', { id: `${id}-opt-${i}`, class: 'g7ia-option', role: 'option', 'aria-selected': 'false' }, s.container ? `${s.label} ›` : s.label);
            if (s.description) {
                li.append(el('small', {}, s.description));
            }
            // mousedown — 입력칸 blur 보다 먼저 받아야 목록이 닫히기 전에 고를 수 있다
            li.addEventListener('mousedown', (e) => {
                e.preventDefault();
                void choose(i);
            });
            list.append(li);
        });
        list.hidden = false;
        searchInput.setAttribute('aria-expanded', 'true');
        setActive(-1);
    };

    const providerFailed = (error: unknown): void => {
        logger.warn('provider failed', error);
        providerBroken = true;
        closeList();
        showNotice(t('dialog.provider_failed', '주소 검색을 사용할 수 없습니다. 아래 칸에 직접 입력해 주세요.'));
    };

    const runSearch = async (query: string, parentId?: string): Promise<void> => {
        if (!options.provider || providerBroken) {
            return;
        }
        inflight?.abort();
        const controller = new AbortController();
        inflight = controller;
        try {
            suggestions = await options.provider.search(query, address.countryCode, controller.signal, parentId);
            if (!controller.signal.aborted) {
                renderList();
            }
        } catch (error) {
            if (!controller.signal.aborted) {
                providerFailed(error);
            }
        }
    };

    const choose = async (index: number): Promise<void> => {
        const suggestion = suggestions[index];
        if (!suggestion || !options.provider) {
            return;
        }
        if (suggestion.container) {
            await runSearch(searchInput.value.trim(), suggestion.id);
            return;
        }
        closeList();
        try {
            const result = await options.provider.retrieve(suggestion, address.countryCode);
            address = normalizeAddress({ ...result.address, countryCode: address.countryCode });
            chosenRaw = result.raw;
            searchInput.value = '';
            fillInputs();
            chosenProvider = options.provider.id;
            // 번지·호수는 사람이 확인해야 한다 — 주소 2 로 보낸다
            inputs.addressLine2!.focus();
        } catch (error) {
            providerFailed(error);
        }
    };

    searchInput.addEventListener('input', () => {
        if (timer) {
            clearTimeout(timer);
        }
        const query = searchInput.value.trim();
        if (query.length < MIN_QUERY) {
            inflight?.abort();
            closeList();
            showNotice(providerBroken ? notice.textContent ?? '' : '');
            return;
        }
        timer = setTimeout(() => void runSearch(query), DEBOUNCE_MS);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (list.hidden || suggestions.length === 0) {
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((activeIndex + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive(activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1);
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            void choose(activeIndex);
        } else if (e.key === 'Escape') {
            e.stopPropagation();
            closeList();
        }
    });

    searchInput.addEventListener('blur', () => setTimeout(closeList, 150));

    // ── 열기·닫기 ────────────────────────────────────────────
    return new Promise<DialogResult | null>((resolve) => {
        const finish = (result: DialogResult | null): void => {
            inflight?.abort();
            if (timer) {
                clearTimeout(timer);
            }
            document.removeEventListener('keydown', onKeydown, true);
            overlay.remove();
            previousFocus?.focus?.();
            resolve(result);
        };

        const onKeydown = (e: KeyboardEvent): void => {
            if (e.key === 'Escape' && list.hidden) {
                e.preventDefault();
                finish(null);
            } else if (e.key === 'Tab') {
                // 창 밖으로 초점이 나가지 않게 가둔다
                const focusables = Array.from(dialog.querySelectorAll<HTMLElement>('button,input,select')).filter((n) => !n.hasAttribute('disabled') && n.offsetParent !== null);
                if (focusables.length === 0) {
                    return;
                }
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        closeBtn.addEventListener('click', () => finish(null));
        cancelBtn.addEventListener('click', () => finish(null));
        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) {
                finish(null);
            }
        });
        applyBtn.addEventListener('click', () => {
            submitted = true;
            refresh();
            const firstError = (['countryCode', 'addressLine1', 'addressLine2', 'city', 'state', 'postalCode'] as const).find((k) => errors[k]);
            if (firstError) {
                (firstError === 'countryCode' ? countrySelect : inputs[firstError])?.focus();
                return;
            }
            finish({ address: normalizeAddress(address), provider: chosenProvider, raw: chosenRaw });
        });
        document.addEventListener('keydown', onKeydown, true);

        document.body.appendChild(overlay);
        fillInputs();
        (options.provider ? searchInput : inputs.addressLine1!).focus();
    });
}
