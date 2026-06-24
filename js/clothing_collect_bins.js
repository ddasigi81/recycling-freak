/* Clothing Collect Bins API client
 * Generated from openapi/clothing_collect_bins.yaml
 * Exposes: fetchBins(opts), setServiceKey(key), setBaseUrl(url)
 */
(function(){
  const DEFAULT_BASE = (typeof window !== 'undefined' && window.CLOTHING_BINS_BASE) ? window.CLOTHING_BINS_BASE : 'https://api.data.go.kr/openapi';
  // Prefer Cloudflare Pages injected var CLOTHING_COLLECT_BINS_API_KEY, then legacy window var, then env
  let SERVICE_KEY = (typeof window !== 'undefined' && (window.CLOTHING_COLLECT_BINS_API_KEY || window.CLOTHING_BINS_SERVICE_KEY)) ? (window.CLOTHING_COLLECT_BINS_API_KEY || window.CLOTHING_BINS_SERVICE_KEY) : '';
  let BASE = DEFAULT_BASE;

  function setServiceKey(key){ SERVICE_KEY = key; if(typeof window !== 'undefined') {
    window.CLOTHING_BINS_SERVICE_KEY = key;
    try{ window.CLOTHING_COLLECT_BINS_API_KEY = key; }catch(e){}
  } }
  function setBaseUrl(url){ BASE = url; if(typeof window !== 'undefined') window.CLOTHING_BINS_BASE = url; }

  function buildParams(params){
    return Object.entries(params)
      .filter(([k,v]) => v !== undefined && v !== null)
      .map(([k,v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v)))
      .join('&');
  }

  // opts: { pageNo, numOfRows, type, filters... }
  async function fetchBins({ pageNo=1, numOfRows=100, type='json', ...filters } = {}){
    if(!SERVICE_KEY){
      if(typeof process !== 'undefined' && process && process.env && process.env.DATA_GO_KR_KEY){
        SERVICE_KEY = process.env.DATA_GO_KR_KEY;
      }
    }
    if(!SERVICE_KEY) throw new Error('Clothing Collect Bins: serviceKey not set. Call setServiceKey(key) or provide DATA_GO_KR_KEY in env.');

    const params = Object.assign({ serviceKey: SERVICE_KEY, pageNo, numOfRows, type }, filters);
    const url = BASE.replace(/\/$/, '') + '/tn_pubr_public_clothing_collect_bins_api?' + buildParams(params);

    const res = await fetch(url, { method: 'GET' });
    if(!res.ok) throw new Error(`Clothing API HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();

    // Normalize items: response.body.items -> array
    let items = [];
    try {
      const maybe = data && data.response && data.response.body && data.response.body.items;
      if(Array.isArray(maybe)) items = maybe;
      else if(maybe && maybe.item) items = Array.isArray(maybe.item) ? maybe.item : [maybe.item];
      else if(Array.isArray(data.items)) items = data.items;
      else if(Array.isArray(data.data)) items = data.data;
    } catch(e){ items = []; }

    const normalized = items.map(it => ({
      id: it.MNG_NO || '',
      name: it.INSTL_PLC_NM || '',
      addr: it.LCTN_ROAD_NM_ADDR || it.LCTN_LOTNO_ADDR || '',
      lat: it.LAT ? Number(it.LAT) : (it.latitude ? Number(it.latitude) : 0),
      lng: it.LOT ? Number(it.LOT) : (it.longitude ? Number(it.longitude) : 0),
      raw: it
    }));

    return { raw: data, items: normalized, meta: { pageNo: data?.response?.body?.pageNo, numOfRows: data?.response?.body?.numOfRows, totalCount: data?.response?.body?.totalCount } };
  }

  const exports = { fetchBins, setServiceKey, setBaseUrl };
  if(typeof module !== 'undefined' && module.exports) module.exports = exports;
  if(typeof window !== 'undefined') window.clothingBinsClient = exports;
})();
