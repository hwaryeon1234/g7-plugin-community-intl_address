/**
 * community-intl_address 플러그인 핸들러
 */

import { openIntlAddressHandler } from './openIntlAddress';

/**
 * 핸들러 맵
 *
 * ActionDispatcher 에 등록할 때 플러그인 식별자가 네임스페이스로 붙는다.
 * 예: 'openIntlAddress' -> 'community-intl_address.openIntlAddress'
 */
export const handlerMap = {
    openIntlAddress: openIntlAddressHandler,
} as const;
