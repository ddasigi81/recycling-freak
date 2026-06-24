/* =========================================================================
 * config.js
 * 분리수거에 진심 - 전역 설정
 * -------------------------------------------------------------------------
 * 실제 운영 시 아래 키 값을 입력하면 OpenAPI 연동이 활성화됩니다.
 *  - KAKAO_JS_KEY    : 카카오 지도 JavaScript 키 (https://developers.kakao.com)
 *  - DATA_GO_KR_KEY  : 공공데이터포털 서비스키 (https://www.data.go.kr)
 *
 * 키는 화면 우상단 "API 키 설정"에서 입력할 수 있으며,
 * 입력값은 브라우저 localStorage 에 저장됩니다.
 * 키가 없으면 자동으로 내장 샘플(더미) 데이터로 동작합니다.
 * ========================================================================= */

const CONFIG = {
  // localStorage 우선, 없으면 빈 값
  get KAKAO_JS_KEY() {
    return localStorage.getItem("KAKAO_JS_KEY") || "";
  },
  get DATA_GO_KR_KEY() {
    return localStorage.getItem("DATA_GO_KR_KEY") || (typeof window !== 'undefined' && window.DATA_GO_KR_KEY) || "";
  },
  get VWORLD_API_KEY() {
    // Prefer Cloudflare-injected global, then localStorage
    return (typeof window !== 'undefined' && window.VWORLD_API_KEY) || localStorage.getItem("VWORLD_API_KEY") || "";
  },
  get CLOTHING_COLLECT_BINS_API_KEY() {
    return (typeof window !== 'undefined' && window.CLOTHING_COLLECT_BINS_API_KEY) || localStorage.getItem("CLOTHING_COLLECT_BINS_API_KEY") || "";
  },

  // 키가 모두 없으면 더미 데이터 모드 (any of known keys present -> live)
  get USE_DUMMY() {
    return !this.DATA_GO_KR_KEY && !this.VWORLD_API_KEY && !this.CLOTHING_COLLECT_BINS_API_KEY;
  },


  // 지도 기본 좌표 (서울시청)
  DEFAULT_CENTER: { lat: 37.5665, lng: 126.978 },
  DEFAULT_ZOOM: 5,
};

/* -------------------------------------------------------------------------
 * 카테고리 정의 (중앙 상단 탭)
 *  - id        : 내부 식별자
 *  - label     : 화면 표시명
 *  - icon      : lucide 아이콘 이름 (SVG data-lucide)
 *  - type      : "bin"  -> 수거함 위치(주소+위경도) 리스트 + 지도 마커
 *                "info" -> 정보형(수수료/배출정보) 카드 리스트
 *  - endpoint  : 공공데이터포털 OpenAPI 엔드포인트(예시)
 *  - fields    : 응답 필드 매핑
 * ----------------------------------------------------------------------- */
const CATEGORIES = [
  {
    id: "smallAppliance",
    label: "중소형 폐가전 수거함",
    icon: "monitor-smartphone",
    type: "bin",
    endpoint: "https://api.data.go.kr/openapi/tn_pubr_public_smallappliance_box_api",
    fields: { addr: "rdnmadr", lat: "latitude", lng: "longitude", name: "instlpcNm" },
  },
  {
    id: "medicine",
    label: "폐의약품 수거함",
    icon: "pill",
    type: "bin",
    endpoint: "https://api.data.go.kr/openapi/tn_pubr_public_wasted_medicine_box_api",
    fields: { addr: "rdnmadr", lat: "latitude", lng: "longitude", name: "instlpcNm" },
  },
  {
    id: "clothing",
    label: "의류수거함",
    icon: "shirt",
    type: "bin",
    endpoint: "https://api.data.go.kr/openapi/tn_pubr_public_clothing_box_api",
    fields: { addr: "rdnmadr", lat: "latitude", lng: "longitude", name: "instlpcNm" },
  },
  {
    id: "lampBattery",
    label: "폐형광등·폐건전지 수거함",
    icon: "lightbulb",
    type: "bin",
    endpoint: "https://api.data.go.kr/openapi/tn_pubr_public_lamp_battery_box_api",
    fields: { addr: "rdnmadr", lat: "latitude", lng: "longitude", name: "instlpcNm" },
  },
  {
    id: "bulkyFee",
    label: "대형폐기물 수거수수료 정보",
    icon: "sofa",
    type: "info",
    endpoint: "https://api.data.go.kr/openapi/tn_pubr_public_bulky_waste_fee_api",
    fields: { item: "prdlstNm", spec: "standardNm", fee: "amount" },
  },
];
