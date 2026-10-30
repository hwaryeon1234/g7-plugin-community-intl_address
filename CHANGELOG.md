# Changelog

이 프로젝트의 모든 주요 변경사항을 기록합니다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며,
[Semantic Versioning](https://semver.org/lang/ko/)을 준수합니다.

## [0.1.0] - 2026-10-30

### Added

- 해외 주소 입력 창: 국가별 필수 칸, 우편번호 형식 검증, 주·도 선택지(미국·캐나다·호주·일본·홍콩·UAE)를 제공하고, 한 줄 주소를 미리 보여 줍니다.
- 주소 자동완성 제공자: Google Places (New), Loqate, Geoapify 중에서 고릅니다. 실패하면 직접 입력으로 계속할 수 있습니다.
- `address_search_slot` 확장 조각: 주소 검색 자리가 있는 모든 화면에 「해외 주소」 버튼을 붙입니다.
- 이커머스 해외 배송지 연동: 주문서, 배송지 관리 모달, 마이페이지 배송지, 관리자 주문 상세의 해외 주소 칸과 배송 국가를 채웁니다.
- 공개 스크립트 API `window.G7IntlAddress` (국가 목록, 형식, 검증, 한 줄 표기, 입력 창).
- 관리자 설정 화면 (제공자, API 키, 기본·허용 국가, 대한민국 제외, 테마 색상).
