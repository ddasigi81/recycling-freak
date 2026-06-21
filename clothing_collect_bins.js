/* Clothing Collect Bins API client (from openapi/clothing_collect_bins.yaml)
 * - Browser & Node friendly (uses fetch)
 * - Exposes: fetchClothingCollectBins(opts), fetchAllClothingBins(opts), setServiceKey(key), setBaseUrl(url)
 * - Returns parsed items array from response.response.body.items
 */
(function(){
  const DEFAULT_BASE = (typeof window !== 'undefined' && window.CLOTHING_BINS_BASE_URL) ? window.CLOTHING_BINS_BASE_URL : 'https://api.data.go.kr/openapi';
  let SERVICE_KEY = (typeof window !== 'undefined' && window.CLOTHING_BINS_SERVICE_KEY) ? window.CLOTHING_BINS_SERVICE_KEY : '6ceaa2c307668e30f21f752a658b8b94ab9a0e3ee7a43ba1e59de3eb36d4f6e0';
  let BASE = DEFAULT_BASE;

  function setServiceKey(key){ SERVICE_KEY = key; if(typeof window !== 'undefined') window.CLOTHING_BINS_SERVICE_KEY = key; }
  function setBaseUrl(url){ BASE = url; if(typeof window !== 'undefined') window.CLOTHING_BINS_BASE_URL = url; }

  function buildParams(params){
    return Object.entries(params)
      .filter(([k,v]) => v !== undefined && v !== null)
      .map(([k,v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v)))
      .join('&');
  }

  async function fetchClothingCollectBins({ serviceKey, pageNo=1, numOfRows=100, type='json', filters={} } = {}){
    const key = serviceKey || SERVICE_KEY || ((typeof process !== 'undefined' && process.env && process.env.CLOTHING_BINS_SERVICE_KEY) ? process.env.CLOTHING_BINS_SERVICE_KEY : undefined);
    if(!key) throw new Error('ClothingCollectBins: serviceKey required. Call setServiceKey(key) or provide serviceKey param.');

    const params = Object.assign({ serviceKey: key, pageNo, numOfRows, type }, filters);
    const url = BASE.replace(/\/$/, '') + '/tn_pubr_public_clothing_collect_bins_api?' + buildParams(params);

    const res = await fetch(url, { method: 'GET' });
    if(!res.ok) throw new Error(`ClothingCollectBins HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();

    // follow the OpenAPI schema: data.response.body.items
    const items = (((data || {}).response || {}).body || {}).items || [];
    return { raw: data, items };
  }

  // helper to fetch all pages (capped)
  async function fetchAllClothingBins({ serviceKey, numOfRows=500, maxPages=10, filters={} } = {}){
    const all = [];
    let page = 1;
    while(page <= maxPages){
      const resp = await fetchClothingCollectBins({ serviceKey, pageNo: page, numOfRows, filters });
      if(!resp || !Array.isArray(resp.items) || resp.items.length === 0) break;
      all.push(...resp.items);
      // check totalCount if available to know when to stop
      const total = (((resp.raw || {}).response || {}).body || {}).totalCount;
      if(total){
        if(all.length >= Number(total)) break;
      }
      // if fewer than requested rows returned, done
      if(resp.items.length < numOfRows) break;
      page += 1;
    }
    return all;
  }

  const exports = { fetchClothingCollectBins, fetchAllClothingBins, setServiceKey, setBaseUrl };
  if(typeof module !== 'undefined' && module.exports) module.exports = exports;
  if(typeof window !== 'undefined') window.clothingBinsClient = exports;
})();
