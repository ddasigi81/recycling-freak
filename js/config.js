/* =========================================================================
 * config.js
 * 분리수거에 진심 - 전역 설정
 * ========================================================================= */

const CONFIG = {
  get KAKAO_JS_KEY() {
    return localStorage.getItem("KAKAO_JS_KEY") || "";
  },
  get DATA_GO_KR_KEY() {
    return localStorage.getItem("DATA_GO_KR_KEY") || (typeof window !== 'undefined' && window.DATA_GO_KR_KEY) || "";
  },
  get CLOTHING_COLLECT_BINS_API_KEY() {
    return (typeof window !== 'undefined' && window.CLOTHING_COLLECT_BINS_API_KEY) || localStorage.getItem("CLOTHING_COLLECT_BINS_API_KEY") || "";
  },

  get USE_DUMMY() {
    // 무조건 false를 반환하여 항상 OpenAPI 연동 모드로 동작
    return false;
  },

  DEFAULT_CENTER: { lat: 37.5665, lng: 126.978 },
  DEFAULT_ZOOM: 5,
};

/* =========================================================================
 * 카테고리 정의
 * - id: 내부 식별자
 * - label: 화면 표시명
 * - icon: lucide 아이콘 이름
 * - type: "bin"(수거함) | "info"(정보)
 * - endpoint: API 엔드포인트 URL
 * - paramName: '시/군/구'를 전달할 파라미터 이름 (Worker API용)
 * - fields: API 응답의 데이터 필드 매핑
 * ========================================================================= */
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
    // 이 카테고리는 별도 Worker를 사용합니다.
    endpoint: "https://mute-leaf-ed2f.ddasigi.workers.dev/",
    paramName: "SGG_NM", // '시/군/구'를 전달할 파라미터 이름
    fields: {
      name: "설치장소",
      addr: "소재지도로명주소", // 도로명주소를 우선 사용
      addr_jibun: "소재지지번주소", // 도로명주소 없을 시 지번주소 사용
      lat: "위도",
      lng: "경도",
    },
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
