/* =========================================================================
 * api.js
 * OpenAPI 연동 계층.
 * - 페이지네이션, 카테고리별 API 분기, 오류 처리 등을 담당합니다.
 * ========================================================================= */

/**
 * 주어진 엔드포인트에 대해 모든 페이지를 조회하여 결과를 병합합니다.
 * @param {string} endpoint - API 엔드포인트 URL
 * @param {object} baseParams - 페이지 번호 외의 기본 요청 파라미터
 * @param {number} numOfRows - 페이지당 요청할 항목 수
 * @returns {Promise<Array>} 병합된 전체 아이템 배열
 */
async function fetchPaginatedData(endpoint, baseParams, numOfRows = 100) {
  let allItems = [];
  let pageNo = 1;

  while (true) {
    const params = new URLSearchParams({
      ...baseParams,
      pageNo: pageNo.toString(),
      numOfRows: numOfRows.toString(),
    });

    try {
      const res = await fetch(`${endpoint}?${params}`);
      if (!res.ok) {
        // Log and break instead of throwing, to handle non-critical API failures gracefully
        console.error(`API request to ${endpoint} failed with status ${res.status}`);
        break;
      }
      const json = await res.json();
      const items = extractItems(json);

      if (items.length > 0) {
        allItems = allItems.concat(items);
      }

      // Determine total count from various possible response structures
      const totalCount = parseInt(json?.response?.body?.totalCount ?? json?.totalCount ?? json?.total_count ?? 0, 10);

      if (items.length === 0 || items.length < numOfRows || (totalCount > 0 && allItems.length >= totalCount)) {
        break;
      }

      pageNo++;
      if (pageNo > 50) { // Safety break
        console.warn("Pagination loop exceeded 50 pages, breaking.");
        break;
      }
    } catch (error) {
      console.error(`Error fetching paginated data from ${endpoint}:`, error);
      break;
    }
  }
  return allItems;
}

const Api = {
  /* 지역 검색 (Kakao API via Worker) */
  async searchRegions(keyword, mode) {
    if (CONFIG.USE_DUMMY) {
      return searchRegionsDummy(keyword, mode);
    }
    try {
      const workerUrl = `https://royal-cloud-1f37.ddasigi.workers.dev/?query=${encodeURIComponent(keyword)}`;
      const res = await fetch(workerUrl);
      if (!res.ok) throw new Error(`Worker request failed: ${res.status}`);
      const kakaoResult = await res.json();
      return (kakaoResult.documents || []).map(item => {
        const addr = item.road_address || item.address;
        return {
          type: mode,
          sigungu: `${addr.region_1depth_name || ""} ${addr.region_2depth_name || ""}`.trim(),
          emd: addr.region_3depth_name || "",
          road: item.road_address ? item.road_address.road_name : "",
          lat: parseFloat(item.y), lng: parseFloat(item.x),
          displayName: item.address_name, fullName: item.address_name,
        };
      }).filter(r => r.lat && r.lng);
    } catch (e) {
      console.error("[v0] 지역 검색 API 오류:", e);
      return searchRegionsDummy(keyword, mode);
    }
  },

  /* 수거함/정보 조회 - 설정 기반의 범용 API 호출 함수 */
  async fetchDataForCategory(region, category) {
    if (CONFIG.USE_DUMMY && category.type === 'bin') {
        return generateDummyBins(region, category, 25);
    }
    if (CONFIG.USE_DUMMY && category.type === 'info') {
        return category.id === "bulkyFee" ? BULKY_FEE_SAMPLE.slice() : HOUSEHOLD_WASTE_SAMPLE.slice();
    }

    try {
      let baseParams;
      const endpoint = category.endpoint;
      const isDataGoKr = endpoint.includes("api.data.go.kr");

      if (isDataGoKr) {
        if (!CONFIG.DATA_GO_KR_KEY) return []; // 키 없으면 빈 배열 반환
        baseParams = { serviceKey: CONFIG.DATA_GO_KR_KEY, type: "json", rdnmadr: region.fullName };
      } else {
        // Worker 또는 다른 외부 API
        const sggNm = region.sigungu.split(' ').pop();
        if (!sggNm || !category.paramName) return [];
        baseParams = { [category.paramName]: sggNm };
      }

      const allItems = await fetchPaginatedData(endpoint, baseParams);
      const f = category.fields;
      
      if (category.type === 'bin') {
        return allItems.map(it => ({
            name: it[f.name] || category.label,
            // 주소 필드는 도로명(addr)을 우선하고, 없으면 지번(addr_jibun) 사용
            addr: it[f.addr] || it[f.addr_jibun] || "",
            lat: parseFloat(it[f.lat]),
            lng: parseFloat(it[f.lng]),
          })).filter(b => b.addr && !isNaN(b.lat) && !isNaN(b.lng));
      } else if (category.type === 'info') {
         if (category.id === "bulkyFee") {
            return allItems.map(it => ({ item: it[f.item], spec: it[f.spec], fee: Number(it[f.fee]) || 0 }));
        }
        return allItems.map(it => ({ title: it[f.title], day: it[f.day], time: it[f.time], method: it[f.method] }));
      }

    } catch (e) {
      console.error(`[v0] ${category.label} API 오류:`, e.message);
      return category.type === 'bin' ? generateDummyBins(region, category, 25) : [];
    }
  },
};

/* 다양한 구조의 응답에서 items 배열 추출 */
function extractItems(json) {
  if (!json) return [];
  if (json?.response?.body?.items?.item) return [].concat(json.response.body.items.item);
  if (Array.isArray(json.items)) return json.items;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json)) return json;
  return [];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
