/* =========================================================================
 * api.js
 * OpenAPI 연동 계층.
 *  - 키가 설정되어 있으면 공공데이터포털(data.go.kr) 호출
 *  - 키가 없으면 data.js 의 더미 데이터로 폴백
 * 모든 함수는 Promise 를 반환합니다.
 * ========================================================================= */

const Api = {
  /* 지역 검색: 도로명/읍면동 입력 -> 전국 동일 명칭 후보 목록 */
  async searchRegions(keyword, mode) {
    if (CONFIG.USE_DUMMY) {
      await delay(250);
      return searchRegionsDummy(keyword, mode);
    }
    // 실제 연동 예시 (행정안전부 도로명주소 OpenAPI)
    // const url = `https://business.juso.go.kr/addrlink/addrLinkApi.do?confmKey=${CONFIG.DATA_GO_KR_KEY}&currentPage=1&countPerPage=100&keyword=${encodeURIComponent(keyword)}&resultType=json`;
    // const res = await fetch(url);
    // const json = await res.json();
    // return (json.results?.juso || []).map(mapJusoToRegion);
    try {
      const url =
        `https://business.juso.go.kr/addrlink/addrLinkApi.do` +
        `?confmKey=${CONFIG.DATA_GO_KR_KEY}&currentPage=1&countPerPage=100` +
        `&keyword=${encodeURIComponent(keyword)}&resultType=json`;
      const res = await fetch(url);
      const json = await res.json();
      const list = (json.results && json.results.juso) || [];
      return list.map((j) => ({
        type: mode,
        sigungu: `${j.siNm} ${j.sggNm}`.trim(),
        emd: j.emdNm,
        road: j.rn,
        lat: 0,
        lng: 0,
        displayName: mode === "road" ? j.rn : j.emdNm,
        fullName: mode === "road" ? `${j.siNm} ${j.sggNm} ${j.rn}` : `${j.siNm} ${j.sggNm} ${j.emdNm}`,
      }));
    } catch (e) {
      console.log("[v0] 지역 검색 API 오류, 더미로 폴백:", e.message);
      return searchRegionsDummy(keyword, mode);
    }
  },

  /* 수거함 위치 조회 (type=bin 카테고리) */
  async fetchBins(region, category) {
    if (CONFIG.USE_DUMMY) {
      await delay(350);
      const count = 8 + Math.floor(Math.random() * 35); // 수십 건까지 발생
      return generateDummyBins(region, category, count);
    }
    try {
      const params = new URLSearchParams({
        serviceKey: CONFIG.DATA_GO_KR_KEY,
        pageNo: "1",
        numOfRows: "300",
        type: "json",
        // 시군구/지역 파라미터는 데이터셋별 상이 — 예시
        rdnmadr: region.fullName,
      });
      const res = await fetch(`${category.endpoint}?${params}`);
      const json = await res.json();
      const items = extractItems(json);
      const f = category.fields;
      return items
        .map((it) => ({
          name: it[f.name] || category.label,
          addr: it[f.addr] || "",
          lat: parseFloat(it[f.lat]),
          lng: parseFloat(it[f.lng]),
        }))
        .filter((b) => !isNaN(b.lat) && !isNaN(b.lng));
    } catch (e) {
      console.log("[v0] 수거함 API 오류, 더미로 폴백:", e.message);
      const count = 8 + Math.floor(Math.random() * 35);
      return generateDummyBins(region, category, count);
    }
  },

  /* 정보형 조회 (대형폐기물 수수료 / 생활쓰레기 배출정보) */
  async fetchInfo(region, category) {
    if (CONFIG.USE_DUMMY) {
      await delay(300);
      return category.id === "bulkyFee" ? BULKY_FEE_SAMPLE.slice() : HOUSEHOLD_WASTE_SAMPLE.slice();
    }
    try {
      const params = new URLSearchParams({
        serviceKey: CONFIG.DATA_GO_KR_KEY,
        pageNo: "1",
        numOfRows: "300",
        type: "json",
        rdnmadr: region.fullName,
      });
      const res = await fetch(`${category.endpoint}?${params}`);
      const json = await res.json();
      const items = extractItems(json);
      const f = category.fields;
      if (category.id === "bulkyFee") {
        return items.map((it) => ({ item: it[f.item], spec: it[f.spec], fee: Number(it[f.fee]) || 0 }));
      }
      return items.map((it) => ({ title: it[f.title], day: it[f.day], time: it[f.time], method: it[f.method] }));
    } catch (e) {
      console.log("[v0] 정보 API 오류, 더미로 폴백:", e.message);
      return category.id === "bulkyFee" ? BULKY_FEE_SAMPLE.slice() : HOUSEHOLD_WASTE_SAMPLE.slice();
    }
  },
};

/* 공공데이터포털 응답에서 items 배열 추출 (구조가 데이터셋마다 다름) */
function extractItems(json) {
  if (!json) return [];
  // 표준 패턴: response.body.items.item
  const byStd = json?.response?.body?.items?.item;
  if (Array.isArray(byStd)) return byStd;
  if (byStd) return [byStd];
  // 그 외 패턴
  if (Array.isArray(json.items)) return json.items;
  if (Array.isArray(json.data)) return json.data;
  return [];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
