/* =========================================================================
 * config.js
 * 애플리케이션 설정
 * ========================================================================= */

const CONFIG = {
  // 카카오 지도 API 키. 실제 서비스 시에는 반드시 본인의 유효한 키로 교체해야 합니다.
  // 이 값은 빌드/배포 과정에서 환경 변수 등을 통해 동적으로 주입하는 것을 권장합니다.
  KAKAO_JS_KEY: "e657dedcfde0c754e50c486e9f14523b",

  // 지도의 기본 중심 좌표 (서울 시청)
  DEFAULT_CENTER: {
    lat: 37.566826,
    lng: 126.9786567,
  },

  // 지도의 기본 확대 레벨
  DEFAULT_ZOOM: 7,
};

/* =========================================================================
 * 카테고리 설정
 * 각 카테고리별로 UI 표시 정보, API 엔드포인트, 필드 매핑 등을 정의합니다.
 * ========================================================================= */
const CATEGORIES = [
      {
        id: "smallAppliance",
        label: "중소형 폐가전 수거함",
        icon: "monitor-smartphone",
        type: "bin",
        endpoint: "https://api.data.go.kr/openapi/tn_pubr_public_smallappliance_box_api",
        paramName: "sggNm",
        fields: { addr: "rdnmadr", lat: "latitude", lng: "longitude", name: "instlpcNm" },
      },
      {
        id: "medicine",
        label: "폐의약품 수거함",
        icon: "pill",
        type: "bin",
        endpoint: "https://api.data.go.kr/openapi/tn_pubr_public_wasted_medicine_box_api",
        paramName: "sggNm",
        fields: { addr: "rdnmadr", lat: "latitude", lng: "longitude", name: "instlpcNm" },
      },
      {
        id: "clothing",
        label: "의류수거함",
        icon: "shirt",
        type: "bin",
        endpoint: "https://mute-leaf-ed2f.ddasigi.workers.dev/",
        paramName: "SGG_NM",
        fields: {
          name: "instlPlcNm",
          addr: "lctnRoadNmAddr",
          addr_jibun: "lctnLotnoAddr",
          lat: "lat",
          lng: "lot",
        },
      },
      {
        id: "lampBattery",
        label: "폐형광등·폐건전지 수거함",
        icon: "lightbulb",
        type: "bin",
        endpoint: "https://api.data.go.kr/openapi/tn_pubr_public_lamp_battery_box_api",
        paramName: "sggNm",
        fields: { addr: "rdnmadr", lat: "latitude", lng: "longitude", name: "instlpcNm" },
      },
      {
        id: "bulkyFee",
        label: "대형폐기물 수거수수료 정보",
        icon: "sofa",
        type: "info",
        endpoint: "https://api.data.go.kr/openapi/tn_pubr_public_bulky_waste_fee_api",
        paramName: "sggNm",
        fields: { item: "prdlstNm", spec: "standardNm", fee: "amount" },
      },
    ];
