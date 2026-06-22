// Adapter main.js — remove duplicated implementations when other modules exist.
// This file will prefer existing app-level functions (from js/app.js) and act as a small adapter
// so the legacy UI (if present) still works without duplicating code.
(function(){
  // Helper: safe access to elements used by older main.js
  const legacyForm = document.getElementById('search-form');
  const legacyAddress = document.getElementById('address');
  const legacyResults = document.getElementById('results');

  function setStatusLegacy(message, tone){
    if(!legacyResults) return;
    legacyResults.innerHTML = `<div class="search-status" data-tone="${tone||''}">${message}</div>`;
  }

  // If app.js provides doRegionSearch, use it for all searches (keeps behavior centralized)
  if(typeof window.doRegionSearch === 'function'){
    // If legacy form exists, bind it to call app's doRegionSearch
    if(legacyForm){
      legacyForm.addEventListener('submit', function(ev){
        ev.preventDefault();
        // copy input value into app searchInput if present
        const appInput = document.getElementById('searchInput');
        if(appInput && legacyAddress){ appInput.value = legacyAddress.value; }
        try{
          window.doRegionSearch();
        }catch(e){
          console.error('doRegionSearch call failed', e);
        }
      });
    }

    // Nothing else to do — app.js handles VWorld flow and modal
    return;
  }

  // If app.js isn't present, provide minimal fallback but avoid duplicating code from other modules.
  // Provide small wrappers that reuse vworldClient and Api when available.
  const vworld = window.vworldClient;
  const clothingClient = window.clothingBinsClient; // may be undefined

  // If no legacy UI elements, nothing to adapt
  if(!legacyForm || !legacyAddress || !legacyResults){
    return;
  }

  legacyForm.addEventListener('submit', async function(ev){
    ev.preventDefault();
    const q = (legacyAddress.value || '').trim();
    if(!q) return;

    const addrInput = document.querySelector('input[name="addressType"]:checked');
    const addrType = addrInput ? addrInput.value : 'road';
    const vtype = addrType === 'road' ? 'ROAD' : 'DISTRICT';

    setStatusLegacy('VWorld로 검색 중...', 'loading');

    if(vworld && typeof vworld.searchFeatures === 'function'){
      try{
        const resp = await vworld.searchFeatures({ query: q, type: vtype, size: 100 });
        const items = (resp && resp.items) || [];
        if(!items.length){ setStatusLegacy('검색 결과가 없습니다.', 'empty'); return; }

        // If app.js provides createVWorldModal, use it; otherwise build a tiny modal
        if(typeof window.createVWorldModal === 'function'){
          window.createVWorldModal(items, async (selected) => {
            // attempt to fetch clothing bins via Api.fetchBins if available
            if(typeof window.Api === 'object' && typeof window.Api.fetchBins === 'function'){
              // map selected to region
              const region = {
                type: vtype === 'ROAD' ? 'road' : 'jibun',
                fullName: selected.title || (selected.address && (selected.address.road || selected.address.parcel)) || '',
                sigungu: (selected.address && (selected.address.sigungu || selected.address.sgg || selected.address.region)) || '',
                road: (selected.address && selected.address.road) || '',
                emd: (selected.address && selected.address.parcel) || '',
                lat: selected.point ? parseFloat(selected.point.y) : 0,
                lng: selected.point ? parseFloat(selected.point.x) : 0,
              };
              setStatusLegacy('의류수거함을 조회 중입니다...', 'loading');
              try{
                const category = (window.CATEGORIES || []).find(c => c.id === 'clothing') || { id: 'clothing', type: 'bin', label: '의류수거함' };
                const bins = await Api.fetchBins(region, category);
                // prefer app's renderBinList if available
                if(typeof window.renderBinList === 'function'){
                  window.renderBinList(bins);
                }else{
                  // render minimal list
                  renderBinsMinimal(bins);
                }
              }catch(e){
                console.error(e);
                setStatusLegacy('의류수거함 조회 실패', 'error');
              }
            }else if(clothingClient && typeof clothingClient.fetchAllClothingBins === 'function'){
              // fallback to clothing client
              try{
                const filters = {};
                const items = await clothingClient.fetchAllClothingBins({ numOfRows:500, maxPages:10, filters });
                renderClothingMinimal(items);
              }catch(e){
                console.error(e);
                setStatusLegacy('의류수거함 조회 실패', 'error');
              }
            }else{
              setStatusLegacy('서버측 수거함 서비스가 준비되지 않았습니다.', 'error');
            }
          }, q);

          setStatusLegacy(`결과 ${items.length}건 - 항목을 선택하세요.`, 'success');
          return;
        }

        // no createVWorldModal — construct tiny modal here
        smallModal(items, async (selected) => {
          // same flow as above
          if(typeof window.Api === 'object' && typeof window.Api.fetchBins === 'function'){
            const region = {
              type: vtype === 'ROAD' ? 'road' : 'jibun',
              fullName: selected.title || (selected.address && (selected.address.road || selected.address.parcel)) || '',
              sigungu: (selected.address && (selected.address.sigungu || selected.address.sgg || selected.address.region)) || '',
              road: (selected.address && selected.address.road) || '',
              emd: (selected.address && selected.address.parcel) || '',
              lat: selected.point ? parseFloat(selected.point.y) : 0,
              lng: selected.point ? parseFloat(selected.point.x) : 0,
            };
            setStatusLegacy('의류수거함을 조회 중입니다...', 'loading');
            try{
              const category = (window.CATEGORIES || []).find(c => c.id === 'clothing') || { id: 'clothing', type: 'bin', label: '의류수거함' };
              const bins = await Api.fetchBins(region, category);
              if(typeof window.renderBinList === 'function') window.renderBinList(bins);
              else renderBinsMinimal(bins);
            }catch(e){ console.error(e); setStatusLegacy('의류수거함 조회 실패','error'); }
          }else if(clothingClient && typeof clothingClient.fetchAllClothingBins === 'function'){
            try{ const items = await clothingClient.fetchAllClothingBins({ numOfRows:500, maxPages:10, filters:{} }); renderClothingMinimal(items); }
            catch(e){ console.error(e); setStatusLegacy('의류수거함 조회 실패','error'); }
          }else{ setStatusLegacy('서버측 수거함 서비스가 준비되지 않았습니다.', 'error'); }
        });

        setStatusLegacy(`결과 ${items.length}건 - 항목을 선택하세요.`, 'success');
        return;
      }catch(err){
        console.error(err);
        setStatusLegacy('검색 실패: ' + (err.message || err), 'error');
        return;
      }
    }

    setStatusLegacy('VWorld 클라이언트가 준비되어 있지 않습니다.', 'error');
  });

  // Minimal modal used only if app.js modal isn't present
  function smallModal(items, onSelect){
    const overlay = document.createElement('div'); overlay.style.position='fixed'; overlay.style.inset='0'; overlay.style.background='rgba(0,0,0,0.35)'; overlay.style.display='grid'; overlay.style.placeItems='center'; overlay.style.zIndex=9999;
    const box = document.createElement('div'); box.style.width='min(720px,96vw)'; box.style.maxHeight='80vh'; box.style.overflow='auto'; box.style.background='#fff'; box.style.borderRadius='10px'; box.style.padding='18px';
    const h = document.createElement('h3'); h.textContent='검색 결과 - 선택하세요'; box.appendChild(h);
    const list = document.createElement('div'); list.style.display='flex'; list.style.flexDirection='column'; list.style.gap='8px';
    items.forEach((it,idx)=>{
      const b = document.createElement('button'); b.textContent = `${idx+1}. ${it.title||''} ${it.address? (it.address.road||it.address.parcel||'') : ''}`; b.style.textAlign='left'; b.style.padding='10px'; b.style.borderRadius='8px'; b.onclick = ()=>{ document.body.removeChild(overlay); onSelect(it); };
      list.appendChild(b);
    });
    box.appendChild(list);
    const close = document.createElement('button'); close.textContent='닫기'; close.style.marginTop='12px'; close.onclick = ()=>document.body.removeChild(overlay); box.appendChild(close);
    overlay.appendChild(box); document.body.appendChild(overlay);
  }

  // Minimal renderer used when app's render functions not available
  function renderBinsMinimal(bins){
    if(!legacyResults) return;
    if(!Array.isArray(bins) || bins.length===0){ legacyResults.innerHTML = '<div class="search-status">검색된 의류수거함이 없습니다.</div>'; return; }
    const grid = document.createElement('div'); grid.style.display='grid'; grid.style.gridTemplateColumns='repeat(auto-fill,minmax(220px,1fr))'; grid.style.gap='12px';
    bins.forEach(b=>{
      const card = document.createElement('div'); card.style.border='1px solid #e6f3ea'; card.style.padding='12px'; card.style.borderRadius='10px';
      const title = document.createElement('div'); title.textContent = b.name || b.title || ''; title.style.fontWeight='800';
      const addr = document.createElement('div'); addr.textContent = b.addr || b.LCTN_ROAD_NM_ADDR || ''; addr.style.color='#4b6b63'; addr.style.fontSize='13px';
      card.appendChild(title); card.appendChild(addr); grid.appendChild(card);
    });
    legacyResults.innerHTML=''; legacyResults.appendChild(grid);
  }

  // Minimal clothing renderer when using clothing client raw items
  function renderClothingMinimal(items){
    if(!legacyResults) return; if(!Array.isArray(items)) return renderBinsMinimal([]);
    const mapped = items.map(it=>({ name: it.INSTL_PLC_NM || it.title || '', addr: it.LCTN_ROAD_NM_ADDR || it.LCTN_LOTNO_ADDR || (it.address && (it.address.road||it.address.parcel)) || '' }));
    renderBinsMinimal(mapped);
  }

})();