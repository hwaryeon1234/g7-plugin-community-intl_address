import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const ko = JSON.parse(read('resources/lang/ko.json'));
const en = JSON.parse(read('resources/lang/en.json'));

const lookup = (dict: any, key: string) => key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), dict);

const LAYOUTS = ['resources/layouts/admin/plugin_settings.g7.html', 'resources/extensions/intl-address-search.g7.html'];

describe('레이아웃 번역 키', () => {
    it.each(LAYOUTS)('%s 의 플러그인 번역 키가 ko·en 에 모두 있다', (file) => {
        const keys = [...read(file).matchAll(/\$t:community-intl_address\.([a-z0-9_.]+)/g)].map((m) => m[1]);
        expect(keys.length).toBeGreaterThan(0);
        keys.forEach((key) => {
            expect(typeof lookup(ko, key), `ko: ${key}`).toBe('string');
            expect(typeof lookup(en, key), `en: ${key}`).toBe('string');
        });
    });

    it('ko·en 번역 키 구조가 같다', () => {
        const flatten = (obj: any, prefix = ''): string[] => Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
        expect(flatten(en).sort()).toEqual(flatten(ko).sort());
    });
});

describe('설정 스키마 동기화', () => {
    const php = read('plugin.php');
    const schemaKeys = [...php.matchAll(/^ {12}'([a-z_]+)' => \[$/gm)].map((m) => m[1]);
    const defaults = JSON.parse(read('config/settings/defaults.json'));

    it('plugin.php 스키마 · defaults.json · 설정 화면 입력칸이 같은 키를 쓴다', () => {
        expect(schemaKeys.length).toBe(8);
        expect(Object.keys(defaults.defaults).sort()).toEqual([...schemaKeys].sort());
        expect(Object.keys(defaults.frontend_schema).sort()).toEqual([...schemaKeys].sort());
        const layout = read('resources/layouts/admin/plugin_settings.g7.html');
        schemaKeys.forEach((key) => expect(layout, key).toContain(`name="${key}"`));
    });

    it('확장 조각은 address_search_slot 에 붙고 등록된 핸들러를 부른다', () => {
        const fragment = read('resources/extensions/intl-address-search.g7.html');
        expect(fragment).toContain('extension-point="address_search_slot"');
        expect(fragment).toContain('handler="community-intl_address.openIntlAddress"');
        expect(fragment).toContain('callbackAction="{{extensionPointCallbacks.onAddressSelect}}"');
    });
});
