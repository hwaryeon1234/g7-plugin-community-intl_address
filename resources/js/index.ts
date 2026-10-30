/**
 * community-intl_address 플러그인 엔트리포인트
 *
 * 플러그인 활성화 시 자동으로 로드되어 핸들러를 등록하고 공개 API(window.G7IntlAddress)를 연다.
 */

import { handlerMap } from './handlers';
import { publicApi } from './api';
import { createLogger, PLUGIN_IDENTIFIER } from './core/runtime';

const logger = createLogger('Plugin');

/** ActionDispatcher 를 기다리는 최대 횟수 (100ms 간격, 5초) */
const MAX_RETRIES = 50;

/**
 * ActionDispatcher 에 핸들러를 등록합니다. 네임스페이스: {plugin-identifier}.{handler-name}
 *
 * @return bool 등록했으면 true
 */
function tryRegister(): boolean {
    const dispatcher = (window as any).G7Core?.getActionDispatcher?.();

    if (!dispatcher) {
        return false;
    }

    Object.entries(handlerMap).forEach(([name, handler]) => {
        dispatcher.registerHandler(`${PLUGIN_IDENTIFIER}.${name}`, handler, {
            category: 'plugin',
            source: PLUGIN_IDENTIFIER,
        });
    });
    logger.log(`${Object.keys(handlerMap).length} handler(s) registered`);

    return true;
}

/**
 * 핸들러 등록 — 코어가 늦게 뜨면 잠시 재시도합니다.
 */
function registerHandlers(): void {
    let retries = 0;

    const attempt = (): void => {
        if (tryRegister()) {
            return;
        }
        if (++retries > MAX_RETRIES) {
            logger.error('Failed to register handlers: ActionDispatcher not available');

            return;
        }
        setTimeout(attempt, 100);
    };

    attempt();
}

/**
 * 플러그인 초기화
 */
export function initPlugin(): void {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerHandlers);
    } else {
        registerHandlers();
    }
}

initPlugin();

if (typeof window !== 'undefined') {
    (window as any).G7IntlAddress = publicApi;
}
