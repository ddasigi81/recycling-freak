/* =========================================================================
 * data.js
 * OpenAPI 키가 없을 때 사용하는 내장 샘플 데이터.
 * 실제 연동 시 api.js 가 이 데이터 대신 OpenAPI 응답을 사용합니다.
 * ========================================================================= */

/* 전국 동일 명칭 시뮬레이션용 지역 데이터
 * (도로명/읍면동을 검색하면 전국에 같은 이름이 여러 개 조회되는 상황 재현) */
const REGION_DB = [
  // 읍면동 - 중복 명칭 예시: "역삼동"은 1곳이지만 "신촌동/중앙동/평동" 등은 여러 시군구에 존재
  { type: "jibun", emd: "역삼동", sigungu: "서울특별시 강남구", lat: 37.5006, lng: 127.0364 },
  { type: "jibun", emd: "삼성동", sigungu: "서울특별시 강남구", lat: 37.5142, lng: 127.0565 },
  { type: "jibun", emd: "서교동", sigungu: "서울특별시 마포구", lat: 37.5547, lng: 126.9186 },

  { type: "jibun", emd: "중앙동", sigungu: "서울특별시 중구", lat: 37.5638, lng: 126.997 },
  { type: "jibun", emd: "중앙동", sigungu: "부산광역시 중구", lat: 35.1043, lng: 129.0353 },
  { type: "jibun", emd: "중앙동", sigungu: "대전광역시 동구", lat: 36.3275, lng: 127.4316 },
  { type: "jibun", emd: "중앙동", sigungu: "경기도 안산시 단원구", lat: 37.3197, lng: 126.8219 },
  { type: "jibun", emd: "중앙동", sigungu: "강원특별자치도 강릉시", lat: 37.7519, lng: 128.8761 },

  { type: "jibun", emd: "신촌동", sigungu: "서울특별시 서대문구", lat: 37.5559, lng: 126.9367 },
  { type: "jibun", emd: "신촌동", sigungu: "광주광역시 광산구", lat: 35.1648, lng: 126.7935 },
  { type: "jibun", emd: "신촌동", sigungu: "경상북도 경주시", lat: 35.8562, lng: 129.2247 },

  { type: "jibun", emd: "평동", sigungu: "광주광역시 광산구", lat: 35.1232, lng: 126.7385 },
  { type: "jibun", emd: "평동", sigungu: "경기도 오산시", lat: 37.1607, lng: 127.0772 },

  { type: "jibun", emd: "정자동", sigungu: "경기도 성남시 분당구", lat: 37.3669, lng: 127.1086 },
  { type: "jibun", emd: "정자동", sigungu: "경기도 수원시 장안구", lat: 37.3026, lng: 126.9905 },

  // 도로명 - 중복 명칭 예시: "중앙로"는 전국에 매우 많음
  { type: "road", road: "중앙로", sigungu: "서울특별시 중구", lat: 37.5612, lng: 126.9966 },
  { type: "road", road: "중앙로", sigungu: "부산광역시 동구", lat: 35.1167, lng: 129.0403 },
  { type: "road", road: "중앙로", sigungu: "대구광역시 중구", lat: 35.8693, lng: 128.5963 },
  { type: "road", road: "중앙로", sigungu: "인천광역시 중구", lat: 37.4738, lng: 126.6217 },
  { type: "road", road: "중앙로", sigungu: "대전광역시 중구", lat: 36.3271, lng: 127.4274 },

  { type: "road", road: "테헤란로", sigungu: "서울특별시 강남구", lat: 37.5045, lng: 127.0445 },
  { type: "road", road: "강남대로", sigungu: "서울특별시 서초구", lat: 37.4979, lng: 127.0276 },
  { type: "road", road: "세종대로", sigungu: "서울특별시 종로구", lat: 37.5717, lng: 126.9765 },

  { type: "road", road: "번영로", sigungu: "부산광역시 금정구", lat: 35.2429, lng: 129.092 },
  { type: "road", road: "번영로", sigungu: "경상남도 김해시", lat: 35.2342, lng: 128.8895 },
  { type: "road", road: "번영로", sigungu: "제주특별자치도 제주시", lat: 33.4825, lng: 126.5614 },
];

/* 도로명/주소 후보 생성용 접미사 */
const ROAD_SUFFIX = ["", "1가", "2가", "3가", "지하상가"];

/* 수거함 명칭 접두사 (카테고리별) */
const BIN_NAME_BY_CAT = {
  smallAppliance: "폐가전 수거함",
  medicine: "폐의약품 수거함",
  clothing: "의류 수거함",
  lampBattery: "폐형광등·건전지 수거함",
};

/* 대형폐기물 수수료 샘플 */
const BULKY_FEE_SAMPLE = [
  { item: "냉장고", spec: "1m 미만", fee: 3000 },
  { item: "냉장고", spec: "1m~2m", fee: 6000 },
  { item: "세탁기", spec: "일반형", fee: 5000 },
  { item: "TV", spec: "30인치 미만", fee: 3000 },
  { item: "TV", spec: "30인치 이상", fee: 6000 },
  { item: "침대(매트리스)", spec: "싱글", fee: 5000 },
  { item: "침대(매트리스)", spec: "더블/퀸", fee: 8000 },
  { item: "소파", spec: "1인용", fee: 3000 },
  { item: "소파", spec: "3인용 이상", fee: 8000 },
  { item: "책상", spec: "일반형", fee: 4000 },
  { item: "옷장", spec: "2짝", fee: 6000 },
  { item: "옷장", spec: "3짝 이상", fee: 10000 },
  { item: "장롱", spec: "1자당", fee: 2000 },
  { item: "식탁", spec: "4인용", fee: 5000 },
  { item: "의자", spec: "사무용/일반", fee: 2000 },
  { item: "자전거", spec: "성인용", fee: 3000 },
];

/* 생활쓰레기 배출정보 샘플 */
const HOUSEHOLD_WASTE_SAMPLE = [
  { title: "일반 종량제(생활쓰레기)", day: "일·화·목요일", time: "일몰 후 ~ 자정", method: "종량제 봉투에 담아 배출" },
  { title: "음식물쓰레기", day: "매일", time: "일몰 후 ~ 자정", method: "전용 용기 또는 음식물 전용봉투 배출" },
  { title: "재활용품(플라스틱/캔/병)", day: "수·금·일요일", time: "일몰 후 ~ 자정", method: "종류별 분리, 투명봉투 또는 마대 배출" },
  { title: "종이류", day: "수·금요일", time: "일몰 후 ~ 자정", method: "물기 제거 후 묶어서 배출" },
  { title: "스티로폼/비닐류", day: "월·목요일", time: "일몰 후 ~ 자정", method: "이물질 제거, 투명봉투 배출" },
];

/* 결정적 의사난수 (지역+카테고리 동일 입력 시 동일 결과) */
function seededRandom(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 233280;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/* 선택된 지역 주변에 가짜 수거함 좌표/주소 생성 */
function generateDummyBins(region, category, count) {
  const rnd = seededRandom(region.sigungu + "|" + (region.emd || region.road) + "|" + category.id);
  const baseLabel = BIN_NAME_BY_CAT[category.id] || "수거함";
  const placeName = region.emd || region.road;
  const result = [];
  for (let i = 0; i < count; i++) {
    const dLat = (rnd() - 0.5) * 0.018;
    const dLng = (rnd() - 0.5) * 0.022;
    const bunji = Math.floor(rnd() * 800) + 1;
    const ho = Math.floor(rnd() * 30) + 1;
    const addr =
      region.type === "road"
        ? `${region.sigungu} ${region.road} ${bunji}`
        : `${region.sigungu} ${region.emd} ${bunji}-${ho}`;
    result.push({
      name: `${placeName} ${baseLabel} ${String(i + 1).padStart(2, "0")}`,
      addr: addr,
      lat: +(region.lat + dLat).toFixed(6),
      lng: +(region.lng + dLng).toFixed(6),
    });
  }
  return result;
}

/* 지역 검색 (도로명/지번) - 전국 동일 명칭 후보 반환 */
function searchRegionsDummy(keyword, mode) {
  const kw = keyword.trim();
  if (!kw) return [];
  const wantType = mode === "road" ? "road" : "jibun";
  return REGION_DB.filter((r) => {
    if (r.type !== wantType) return false;
    const name = r.type === "road" ? r.road : r.emd;
    return name.includes(kw);
  }).map((r) => ({
    ...r,
    displayName: r.type === "road" ? r.road : r.emd,
    fullName: `${r.sigungu} ${r.type === "road" ? r.road : r.emd}`,
  }));
}
