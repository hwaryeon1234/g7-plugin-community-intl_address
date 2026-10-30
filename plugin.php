<?php

namespace Plugins\Community\IntlAddress;

use App\Extension\AbstractPlugin;
use Plugins\Community\IntlAddress\Listeners\RegisterSettingsAttributeLabelsListener;

/**
 * 해외 주소 입력 플러그인
 *
 * 국가별 형식에 맞춘 해외 주소 입력·검증과 주소 자동완성을 제공합니다.
 * Daum 우편번호 플러그인과 같은 짜임이다 — 백엔드 없이 주소 검색 자리(address_search_slot)에 끼워 넣는
 * 조각과 프론트 핸들러만 있고, 고른 주소를 저장하는 일은 그 화면을 소유한 확장이 맡는다.
 */
class Plugin extends AbstractPlugin
{
    /**
     * 플러그인 메타데이터 반환
     *
     * @return array 메타데이터
     */
    public function getMetadata(): array
    {
        return [
            'author' => 'Gnuboard7 Community',
            'license' => 'MIT',
            'homepage' => 'https://github.com/hwaryeon1234/g7-plugin-community-intl_address',
            'keywords' => ['address', 'international', 'overseas', 'autocomplete', 'shipping'],
        ];
    }

    /**
     * 플러그인 설정 스키마 반환
     *
     * 자동완성 키는 브라우저가 제공자에 직접 요청할 때 쓰므로 프론트엔드에 노출된다(defaults.json frontend_schema).
     * 제공자 콘솔에서 반드시 사이트 도메인(HTTP 리퍼러)으로 제한해 둔다 — README 「API 키 보안」 참고.
     *
     * @return array 설정 스키마
     */
    public function getSettingsSchema(): array
    {
        return [
            'provider' => [
                'type' => 'enum',
                'options' => ['none', 'google', 'loqate', 'geoapify'],
                'default' => 'none',
                'label' => [
                    'ko' => '자동완성 제공자',
                    'en' => 'Autocomplete provider',
                ],
                'hint' => [
                    'ko' => '주소 자동완성에 쓸 서비스를 고릅니다. 「사용 안 함」이면 국가별 입력 폼과 검증만 동작합니다.',
                    'en' => 'Service used for address autocomplete. With "None", only the country-aware form and validation are used.',
                ],
                'required' => false,
            ],
            'google_api_key' => [
                'type' => 'string',
                'default' => '',
                'max' => 200,
                'label' => [
                    'ko' => 'Google Places API 키',
                    'en' => 'Google Places API key',
                ],
                'hint' => [
                    'ko' => 'Places API (New) 를 사용 설정한 키. HTTP 리퍼러를 사이트 도메인으로 제한하세요.',
                    'en' => 'Key with Places API (New) enabled. Restrict HTTP referrers to your site domain.',
                ],
                'required' => false,
            ],
            'loqate_api_key' => [
                'type' => 'string',
                'default' => '',
                'max' => 200,
                'label' => [
                    'ko' => 'Loqate API 키',
                    'en' => 'Loqate API key',
                ],
                'hint' => [
                    'ko' => 'Loqate(Address Capture) 키. 계정에서 허용 도메인을 제한하세요.',
                    'en' => 'Loqate (Address Capture) key. Restrict allowed domains in your account.',
                ],
                'required' => false,
            ],
            'geoapify_api_key' => [
                'type' => 'string',
                'default' => '',
                'max' => 200,
                'label' => [
                    'ko' => 'Geoapify API 키',
                    'en' => 'Geoapify API key',
                ],
                'hint' => [
                    'ko' => 'Geoapify 키. 무료 요금제가 있으며 허용 출처(Origin)를 제한할 수 있습니다.',
                    'en' => 'Geoapify key. Has a free tier; restrict allowed origins.',
                ],
                'required' => false,
            ],
            'default_country' => [
                'type' => 'string',
                'default' => 'US',
                'max' => 2,
                'label' => [
                    'ko' => '기본 국가',
                    'en' => 'Default country',
                ],
                'hint' => [
                    'ko' => '입력 창을 열 때 먼저 선택되는 국가 코드 (ISO 3166-1 alpha-2, 예: US)',
                    'en' => 'Country selected when the form opens (ISO 3166-1 alpha-2, e.g. US)',
                ],
                'required' => false,
            ],
            'allowed_countries' => [
                'type' => 'string',
                'default' => '',
                'max' => 1000,
                'label' => [
                    'ko' => '허용 국가',
                    'en' => 'Allowed countries',
                ],
                'hint' => [
                    'ko' => '쉼표로 구분한 국가 코드 (예: US,JP,CN). 비우면 모든 국가. 이커머스 배송 화면은 이커머스 배송 가능 국가와 겹치는 국가만 보입니다.',
                    'en' => 'Comma-separated country codes (e.g. US,JP,CN). Empty means all. Ecommerce shipping screens show only countries also enabled for shipping.',
                ],
                'required' => false,
            ],
            'exclude_kr' => [
                'type' => 'boolean',
                'default' => true,
                'label' => [
                    'ko' => '대한민국 제외',
                    'en' => 'Exclude South Korea',
                ],
                'hint' => [
                    'ko' => '국내 주소는 Daum 우편번호로 입력하도록 국가 목록에서 대한민국을 뺍니다.',
                    'en' => 'Removes South Korea from the list so domestic addresses go through the Korean postcode search.',
                ],
                'required' => false,
            ],
            'theme_color' => [
                'type' => 'string',
                'default' => '#1D4ED8',
                'max' => 7,
                'label' => [
                    'ko' => '테마 색상',
                    'en' => 'Theme color',
                ],
                'hint' => [
                    'ko' => '입력 창의 강조 색상입니다. (예: #1D4ED8)',
                    'en' => 'Accent color of the address window. (e.g. #1D4ED8)',
                ],
                'required' => false,
            ],
        ];
    }

    /**
     * 플러그인 설정 기본값 반환
     *
     * @return array 기본 설정값
     */
    public function getConfigValues(): array
    {
        return array_map(static fn (array $field) => $field['default'], $this->getSettingsSchema());
    }

    /**
     * 플러그인이 제공하는 훅 정보 반환
     *
     * 서버 훅은 없다. 주소 선택은 브라우저에서 일어나는 흐름이라, 선택된 주소에 끼어드는 자리는
     * `openIntlAddress` 핸들러의 callbackAction · intlTarget 매개변수다(docs/extension-points.md).
     *
     * @return array 훅 정의 배열 (없음)
     */
    public function getHooks(): array
    {
        return [];
    }

    /**
     * 구독하는 훅 리스너 목록 반환
     *
     * @return array<int, class-string> 리스너 클래스 목록
     */
    public function getHookListeners(): array
    {
        return [
            RegisterSettingsAttributeLabelsListener::class,
        ];
    }
}
