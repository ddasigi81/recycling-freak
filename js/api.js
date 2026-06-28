/* =========================================================================
 * api.js
 * OpenAPI 연동 계층 (Cloudflare Worker 기반)
 * - 모든 카테고리의 데이터 조회를 워커를 통해 처리합니다.
 * ========================================================================= */

const Api = {
  /**
   * 카카오 API 워커를 통해 주소 키워드로 지역 정보를 검색합니다.
   * 여러 페이지를 모두 조회하여 전체 결과를 반환합니다.
   * @param {string} keyword - 검색할 주소 키워드 (도로명 또는 읍/면/동)
   * @param {string} mode - 검색 모드 ('road' 또는 'jibun')
   * @param {AbortSignal} [signal] - 요청을 중단하기 위한 AbortSignal
   * @returns {Promise<Array>} 검색된 지역 정보 객체 배열
   */
  async searchRegions(keyword, mode, signal) {
    const allDocuments = [];
    let page = 1;
    let isEnd = false;
    const MAX_PAGES = 5; // API 과다호출 방지를 위한 페이지 제한

    try {
      while (!isEnd && page <= MAX_PAGES) {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        
        const workerUrl = `https://royal-cloud-1f37.ddasigi.workers.dev/?query=${encodeURIComponent(keyword)}&page=${page}`;
        const res = await fetch(workerUrl, { signal });

        if (!res.ok) {
          throw new Error(`Region search worker failed: ${res.status} on page ${page}`);
        }
        
        const kakaoResult = await res.json();
        
        if (kakaoResult.documents && kakaoResult.documents.length > 0) {
          allDocuments.push(...kakaoResult.documents);
        }

        isEnd = kakaoResult.meta.is_end;
        page++;
      }

      const filteredDocuments = allDocuments.filter(item => {
        if (mode === 'road') {
          return item.address_type === 'ROAD' || item.address_type === 'ROAD_ADDR';
        } else { // mode === 'jibun'
          return item.address_type !== 'ROAD' && item.address_type !== 'ROAD_ADDR';
        }
      });

      return filteredDocuments.map(item => {
        const addr = item.road_address || item.address;
        return {
          type: mode,
          sigungu: `${addr.region_1depth_name || ""} ${addr.region_2depth_name || ""}`.trim(),
          emd: addr.region_3depth_name || "",
          road: item.road_address ? item.road_address.road_name : "",
          lat: parseFloat(item.y),
          lng: parseFloat(item.x),
          displayName: item.address_name,
          fullName: item.address_name,
        };
      }).filter(r => r.lat && r.lng);

    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error("[v0] 지역 검색 API 오류 (with pagination):", e);
      }
      return [];
    }
  },

  /**
   * 선택된 지역과 카테고리에 해당하는 데이터를 워커를 통해 조회합니다.
   * @param {object} region - 사용자가 선택한 지역 정보 객체
   * @param {object} category - 조회할 데이터의 카테고리 객체
   * @returns {Promise<Array>} 처리된 데이터 아이템 배열
   */
  async fetchDataForCategory(region, category) {
    try {
      const endpoint = category.endpoint;
      if (!region.sigungu || !category.paramName) {
        console.warn("fetchDataForCategory: region 또는 category.paramName이 없습니다.");
        return [];
      }

      const sggNm = (region.sigungu || '').split(' ').pop();
      if (!sggNm) return [];

      const params = new URLSearchParams({ [category.paramName]: sggNm });
      const res = await fetch(`${endpoint}?${params}`);

      if (!res.ok) {
        throw new Error(`API Worker for ${category.label} failed with status ${res.status}`);
      }
      
      const allItems = await res.json();
      const rawItems = extractItems(allItems);

      if (!rawItems || rawItems.length === 0) {
        return [];
      }
      
      const f = category.fields;
      if (category.type === 'bin') {
         return rawItems.map(it => ({
            name: it[f.name] || category.label,
            addr_road: it[f.addr] || "",
            addr_jibun: it[f.addr_jibun] || "",
            addr: it[f.addr] || it[f.addr_jibun] || "",
            lat: parseFloat(it[f.lat]),
            lng: parseFloat(it[f.lng]),
          })).filter(b => b.addr && !isNaN(b.lat) && !isNaN(b.lng));
      } else if (category.type === 'info') {
         if (category.id === "bulkyFee") {
            return rawItems.map(it => ({ item: it[f.item], spec: it[f.spec], fee: Number(it[f.fee]) || 0 }));
        }
        return rawItems.map(it => ({ title: it[f.title], day: it[f.day], time: it[f.time], method: it[f.method] }));
      }
      return [];

    } catch (e) {
      console.error(`[v0] ${category.label} 데이터 조회 오류:`, e.message);
      return [];
    }
  },
};

/**
 * 다양한 구조의 API 응답에서 실제 데이터 배열을 추출합니다.
 * @param {object|Array} json - API로부터 받은 원시 JSON 응답
 * @returns {Array} 데이터 아이템 배열
 */
function extractItems(json) {
  if (!json) return [];
  
  if (json?.response?.body?.items && Array.isArray(json.response.body.items)) {
    return json.response.body.items;
  }

  if (json?.response?.body?.items?.item) {
    return [].concat(json.response.body.items.item);
  }
  
  if (Array.isArray(json)) {
    return json;
  }

  if (Array.isArray(json.data)) {
    return json.data;
  }

  if (Array.isArray(json.items)) {
    return json.items;
  }

  console.warn("Could not extract items from API response", json);
  return [];
}
