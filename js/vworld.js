/* VWorld Search API client
 * Generated from openapi/vworld.yaml
 * Exposes: searchFeatures(opts), setVworldApiKey(key), setVworldBaseUrl(url)
 */
(function(){
  const DEFAULT_BASE = (typeof window !== 'undefined' && window.VWORLD_BASE_URL) ? window.VWORLD_BASE_URL : 'https://api.vworld.kr/req';
  let API_KEY = (typeof window !== 'undefined' && window.VWORLD_API_KEY) ? window.VWORLD_API_KEY : '';
  let BASE = DEFAULT_BASE;

  function setVworldApiKey(key){ API_KEY = key; if(typeof window !== 'undefined') window.VWORLD_API_KEY = key; }
  function setVworldBaseUrl(url){ BASE = url; if(typeof window !== 'undefined') window.VWORLD_BASE_URL = url; }

  function buildParams(params){
    return Object.entries(params)
      .filter(([k,v]) => v !== undefined && v !== null)
      .map(([k,v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v)))
      .join('&');
  }

  async function searchFeatures({ query, type='DISTRICT', category, format='json', size=100, page=1, crs='EPSG:4326', key } = {}){
    if(!query) throw new Error('VWorld: query is required');
    const apiKey = key || API_KEY;
    if(!apiKey) {
      if(typeof process !== 'undefined' && process && process.env && process.env.VWORLD_API_KEY){
        API_KEY = process.env.VWORLD_API_KEY;
      }
    }
    if(!apiKey && !API_KEY) throw new Error('VWorld API key not set. Call setVworldApiKey(key) or provide key param.');

    const params = {
      key: key || API_KEY,
      service: 'search',
      version: '2.0',
      request: 'search',
      query,
      type,
      format,
      size,
      page,
      crs
    };
    if(category) params.category = category;

    const url = BASE.replace(/\/$/, '') + '/search?' + buildParams(params);

    const res = await fetch(url, { method: 'GET' });
    if(!res.ok) throw new Error(`VWorld HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();

    const items = (((data || {}).response || {}).result || {}).items || [];
    const normalized = items.map(it => ({
      id: it.id,
      title: it.title || (it.properties && it.properties.name) || '',
      point: it.point || (it.geometry && it.geometry.coordinates ? { x: it.geometry.coordinates[0], y: it.geometry.coordinates[1] } : undefined),
      address: it.address || (it.properties && it.properties.address) || {},
      raw: it
    }));

    return { raw: data, items: normalized };
  }

  const exports = { searchFeatures, setVworldApiKey, setVworldBaseUrl };
  if(typeof module !== 'undefined' && module.exports) module.exports = exports;
  if(typeof window !== 'undefined'){
    window.vworldClient = exports;
  }
})();
