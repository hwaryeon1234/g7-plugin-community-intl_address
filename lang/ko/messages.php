<?php

return [
    // 설정 검증 — 설정 항목 이름 (검증 오류 문구의 validation.attributes 병합용, 스키마 전 항목)
    'settings' => [
        'provider_attribute' => '자동완성 제공자',
        'google_api_key_attribute' => 'Google Places API 키',
        'loqate_api_key_attribute' => 'Loqate API 키',
        'geoapify_api_key_attribute' => 'Geoapify API 키',
        'default_country_attribute' => '기본 국가',
        'allowed_countries_attribute' => '허용 국가',
        'exclude_kr_attribute' => '대한민국 제외',
        'theme_color_attribute' => '테마 색상',
    ],
];
