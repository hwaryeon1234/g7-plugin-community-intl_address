/**
 * 제공자 공용 HTTP 도우미
 *
 * @module providers/http
 */

/** 제공자 요청 실패 — 화면은 이 오류를 받으면 직접 입력으로 돌린다 */
export class ProviderError extends Error {
    constructor(message: string, public readonly status: number = 0) {
        super(message);
        this.name = 'ProviderError';
    }
}

/** 요청 제한 시간(ms) */
const TIMEOUT_MS = 8000;

/**
 * JSON 을 받아 옵니다. HTTP 오류·시간 초과·잘못된 JSON 은 ProviderError 로 던집니다.
 * 호출자가 넘긴 signal 로 취소되면 AbortError 를 그대로 던집니다(새 입력으로 이전 요청을 버린 경우).
 */
export async function fetchJson(url: string, init: RequestInit = {}): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const outer = init.signal;

    if (outer) {
        if (outer.aborted) {
            controller.abort();
        } else {
            outer.addEventListener('abort', () => controller.abort(), { once: true });
        }
    }

    try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        const json = await response.json().catch(() => null);

        if (!response.ok) {
            const message = json?.error?.message ?? json?.message ?? `HTTP ${response.status}`;

            throw new ProviderError(String(message), response.status);
        }

        return json;
    } catch (error) {
        if (outer?.aborted) {
            throw error;
        }
        if (error instanceof ProviderError) {
            throw error;
        }

        throw new ProviderError(controller.signal.aborted ? 'timeout' : String((error as Error)?.message ?? error));
    } finally {
        clearTimeout(timer);
    }
}
