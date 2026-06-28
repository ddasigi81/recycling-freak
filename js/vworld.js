/* VWorld Search API client (via Cloudflare Worker) */
(function(){
  const WORKER_BASE_URL = 'https://royal-cloud-1f37.ddasigi.workers.dev/';

  async function searchFeatures(query) {
    if (!query) throw new Error('Query is required');

    const url = `${WORKER_BASE_URL}?query=${encodeURIComponent(query)}`;

    const res = await fetch(url, { method: 'GET' });
    if(!res.ok) throw new Error(`Worker HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();

    // The worker is expected to return the same format as the VWorld API
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

  const exports = { searchFeatures };
  if(typeof module !== 'undefined' && module.exports) module.exports = exports;
  if(typeof window !== 'undefined'){
    window.vworldClient = exports;
  }
})();
