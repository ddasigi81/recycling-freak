/* VWorld Search API client (from openapi/vworld.yaml)
 * - Browser & Node friendly (uses fetch)
 * - Exposes: searchFeatures(opts), setVworldApiKey(key), setVworldBaseUrl(url)
 * - Defaults to official server URL. Avoids referencing `process` or `require` unguarded.
 */
(function(){
  const DEFAULT_BASE = (typeof window !== 'undefined' && window.VWORLD_BASE_URL) ? window.VWORLD_BASE_URL : 'https://api.vworld.kr/req';
  let API_KEY = (typeof window !== 'undefined' && window.VWORLD_API_KEY) ? window.VWORLD_API_KEY : 'A29B9DC7-CE37-392F-9ADE-F948354609DB';
  let BASE = DEFAULT_BASE;

  function setVworldApiKey(key){ API_KEY = key; if(typeof window !== 'undefined') window.VWORLD_API_KEY = key; }
  function setVworldBaseUrl(url){ BASE = url; if(typeof window !== 'undefined') window.VWORLD_BASE_URL = url; }

  // Build query params string
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
      // try environment (Node)
      if(typeof process !== 'undefined' && process && process.env && process.env.VWORLD_API_KEY){
        // eslint-disable-next-line no-process-env
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

    // try normal fetch first
    let res, data;
    try{
      res = await fetch(url, { method: 'GET' });
      if(res.ok){
        data = await res.json();
      }else{
        // non-2xx
        throw new Error(`VWorld HTTP ${res.status}: ${res.statusText}`);
      }
    }catch(err){
      // If running in browser, try JSONP fallback using callfunc
      if(typeof window !== 'undefined'){
        try{
          // enhanced JSONP: try multiple param names and formats
          const tryJsonp = (url, cbName, timeout=10000) => new Promise((resolve, reject) => {
            let cleaned = false;
            const script = document.createElement('script');
            const cleanup = () => {
              if(cleaned) return; cleaned = true;
              try{ delete window[cbName]; }catch(e){}
              script.parentNode && script.parentNode.removeChild(script);
            };
            window[cbName] = (resp) => { cleanup(); resolve(resp); };
            script.src = url;
            script.async = true;
            script.onerror = () => { cleanup(); reject(new Error('VWorld JSONP script load error')); };
            document.head.appendChild(script);
            setTimeout(() => { cleanup(); reject(new Error('VWorld JSONP timeout')); }, timeout);
          });

          const cbBase = '__vworld_cb_' + Date.now() + '_' + Math.floor(Math.random()*1000);
          const variants = [
            {param: 'callfunc', format: undefined},
            {param: 'callback', format: undefined},
            {param: 'callfunc', format: 'jsonp'},
            {param: 'callback', format: 'jsonp'}
          ];

          let lastErr = null;
          for(const v of variants){
            const cbName = cbBase + '_' + Math.floor(Math.random()*1000);
            const paramsJsonp = Object.assign({}, params);
            if(v.format === undefined) delete paramsJsonp.format; else paramsJsonp.format = v.format;
            paramsJsonp[v.param] = cbName;
            const jsonpUrl = BASE.replace(/\/$/, '') + '/search?' + buildParams(paramsJsonp);
            try{
              data = await tryJsonp(jsonpUrl, cbName, 10000);
              if(data) break;
            }catch(e){
              lastErr = e;
              // try next variant
            }
          }
          if(!data) throw lastErr || new Error('VWorld JSONP unknown failure');
        }catch(jsonpErr){
          const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'your origin';
          throw new Error(
            `VWorld request failed: ${err.message}. JSONP fallback also failed: ${jsonpErr.message}.\n`+
            `Options: 1) Register your origin (${origin}) at the VWorld developer center, 2) Call VWorld from your server.`
          );
        }
      }else{
        // Node or non-browser: rethrow
        throw err;
      }
    }

    if(!data) throw new Error('VWorld: empty response');

    // Basic normalization to array of items as described in OpenAPI
    const items = (((data || {}).response || {}).result || {}).items || [];
    const normalized = items.map(it => ({
      id: it.id,
      title: it.title || (it.properties && it.properties.name) || '',
      point: it.point || (it.geometry && it.geometry.coordinates ? { x: it.geometry.coordinates[0], y: it.geometry.coordinates[1] } : undefined),
      address: it.address || (it.properties && it.properties.address) || {},
      raw: it
    }));

    return {
      raw: data,
      items: normalized
    };
  }

  // expose
  const exports = { searchFeatures, setVworldApiKey, setVworldBaseUrl };
  if(typeof module !== 'undefined' && module.exports) module.exports = exports;
  if(typeof window !== 'undefined'){
    window.vworldClient = exports;
  }
})();
