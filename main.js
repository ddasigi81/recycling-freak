// Main UI glue: handle search form, call vworld and clothing bins clients, render popup and results
(function(){
  const form = document.getElementById('search-form');
  const addressInput = document.getElementById('address');
  const resultsEl = document.getElementById('results');

  function setStatus(message, tone){
    resultsEl.innerHTML = `<div class="search-status" data-tone="${tone||''}">${message}</div>`;
  }

  function createModal(items, onSelect, query){
    // two-column modal: left = selectable list (scrollable), right = small map preview
    const overlay = document.createElement('div');
    overlay.className = 'vmodal-overlay';

    const modal = document.createElement('div');
    modal.className = 'vmodal vmodal-wide';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-label','행정구역 선택');

    // header
    const header = document.createElement('div'); header.className = 'vmodal-header';
    const titleWrap = document.createElement('div'); titleWrap.className='vmodal-title-wrap';
    const icon = document.createElement('div'); icon.className='vmodal-title-icon'; icon.textContent='♻️';
    const title = document.createElement('div'); title.className = 'vmodal-title'; title.textContent = '검색 결과';
    titleWrap.appendChild(icon); titleWrap.appendChild(title);
    const closeBtn = document.createElement('button'); closeBtn.className = 'vmodal-close'; closeBtn.setAttribute('aria-label','닫기'); closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => document.body.removeChild(overlay);
    header.appendChild(titleWrap); header.appendChild(closeBtn);

    const subtitle = document.createElement('div'); subtitle.className='vmodal-sub'; subtitle.textContent = `"${query||''}" 검색 결과 — 정확한 지역을 선택하세요.`;

    const bodyGrid = document.createElement('div'); bodyGrid.className='vmodal-grid';

    const leftCol = document.createElement('div'); leftCol.className='vmodal-left';
    const list = document.createElement('div'); list.className = 'vmodal-list';

    items.forEach((it, idx) => {
      const itemBtn = document.createElement('button');
      itemBtn.className = 'vmodal-item-row';

      const num = document.createElement('div'); num.className='vmodal-num'; num.textContent = (idx+1);
      const meta = document.createElement('div'); meta.className='vmodal-meta';
      const name = document.createElement('div'); name.className='vmodal-item-name'; name.textContent = it.title || (it.address && (it.address.parcel || it.address.road)) || '';
      const sub = document.createElement('div'); sub.className='vmodal-item-sub'; sub.textContent = (it.address && (it.address.road || it.address.parcel)) || '';
      meta.appendChild(name); meta.appendChild(sub);

      itemBtn.appendChild(num); itemBtn.appendChild(meta);

      // on click, call onSelect with item
      itemBtn.onclick = (e) => { e.preventDefault(); document.body.removeChild(overlay); onSelect(it); };

      list.appendChild(itemBtn);
    });

    leftCol.appendChild(list);

    const rightCol = document.createElement('div'); rightCol.className='vmodal-right';
    const mapPreview = document.createElement('div'); mapPreview.className='vmodal-map-preview'; mapPreview.textContent='지도 미리보기';
    // small floating card to emulate marker info
    const markerCard = document.createElement('div'); markerCard.className='vmodal-marker-card'; markerCard.innerHTML = `<div class="mc-num">1</div><div class="mc-text">선택 항목 미리보기<br><span class="mc-sub">중소형 가전 근처</span></div>`;
    rightCol.appendChild(mapPreview); rightCol.appendChild(markerCard);

    bodyGrid.appendChild(leftCol); bodyGrid.appendChild(rightCol);

    // footer with guidance
    const footer = document.createElement('div'); footer.className='vmodal-footer';
    const info = document.createElement('div'); info.className='vmodal-footer-info'; info.textContent='목록에서 항목을 선택하면 해당 위치의 의류수거함을 조회합니다.';
    footer.appendChild(info);

    modal.appendChild(header);
    modal.appendChild(subtitle);
    modal.appendChild(bodyGrid);
    modal.appendChild(footer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function renderClothingResults(items){
    if(!Array.isArray(items) || items.length === 0){
      setStatus('검색된 의류수거함이 없습니다.', 'empty');
      return;
    }

    resultsEl.innerHTML = '';
    const headerWrap = document.createElement('div'); headerWrap.className='results-header';
    const h2 = document.createElement('h2'); h2.textContent = `의류수거함 ${items.length}건`; headerWrap.appendChild(h2);
    resultsEl.appendChild(headerWrap);

    const grid = document.createElement('div'); grid.className = 'results-grid cards';

    items.forEach(it => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'result-card';

      const title = document.createElement('div'); title.className = 'card-title'; title.textContent = it.INSTL_PLC_NM || it.title || '';
      const addr = document.createElement('div'); addr.className = 'card-addr'; addr.textContent = it.LCTN_ROAD_NM_ADDR || it.LCTN_LOTNO_ADDR || (it.address && (it.address.road || it.address.parcel)) || '';
      const note = document.createElement('div'); note.className = 'card-note'; note.textContent = it.MNG_NO ? `관리번호 ${it.MNG_NO}` : '';

      card.appendChild(title);
      card.appendChild(addr);
      if(note.textContent) card.appendChild(note);

      card.onclick = () => { setStatus(`${title.textContent} 선택됨`, 'success'); };

      grid.appendChild(card);
    });

    resultsEl.appendChild(grid);
  }

  function normalize(s){ return (s||'').toString().trim().replace(/\s+/g,' ').toLowerCase(); }

  async function onSelectVworld(item, originalQuery, addrType){
    setStatus('의류수거함을 조회 중입니다...', 'loading');

    // derive sgg (시군구) and dong (읍면동) from item.title or address
    const title = item.title || '';
    const parts = title.split(/\s+/).filter(Boolean);
    let dongName = (parts.find(p => /[동읍면리]$/.test(p)) || parts[parts.length-1] || '').trim();
    let sggName = (parts.find(p => /(구|군|시)$/.test(p)) || parts[parts.length-2] || '').trim();

    // fallback: try address fields
    if(item.address){
      if(!dongName && item.address.parcel) dongName = item.address.parcel;
      if(!dongName && item.address.road) dongName = item.address.road;
    }

    // strip trailing words like '동' remains
    dongName = dongName.replace(/^(.+?)(동|읍|면|리)?$/,'$1').trim();
    sggName = sggName.trim();

    if(!sggName){
      setStatus('선택한 항목에서 시군구를 추출할 수 없습니다. 다른 항목을 선택해 주세요.', 'error');
      return;
    }

    try{
      // use client to fetch by SGG_NM and either road or lotno depending on address type
      const client = window.clothingBinsClient;
      if(!client) throw new Error('clothingBinsClient not available');

      // determine which clothing API param to use
      const addrFieldKey = (addrType === 'road') ? 'LCTN_ROAD_NM_ADDR' : 'LCTN_LOTNO_ADDR';
      let addrFieldValue = '';
      if(item.address){
        addrFieldValue = (addrType === 'road') ? (item.address.road || '') : (item.address.parcel || '');
      }
      if(!addrFieldValue) {
        // fallback: use title or original query
        addrFieldValue = originalQuery || title || '';
      }

      const filters = { SGG_NM: sggName };
      if(addrFieldValue) filters[addrFieldKey] = addrFieldValue;

      // fetch all pages up to reasonable limit
      const items = await client.fetchAllClothingBins({ numOfRows: 500, maxPages: 10, filters });

      // filter by dongName - require token presence
      const filtered = items.filter(it => {
        if(!dongName) return true; // if dong unknown, keep all
        const fields = [it.LCTN_ROAD_NM_ADDR, it.LCTN_LOTNO_ADDR, it.INSTL_PLC_NM];
        return fields.some(f => normalize(f).includes(normalize(dongName)));
      });

      renderClothingResults(filtered);
    }catch(err){
      console.error(err);
      setStatus('의류수거함 조회 실패: ' + (err.message || err), 'error');
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const q = (addressInput.value || '').trim();
    if(!q) return;

    // addressType comes from a select now
    const addrType = document.querySelector('input[name="addressType"]:checked').value;
    // Use ROAD for road names, DISTRICT for 지번 (읍/면/동) searches
    const vtype = addrType === 'road' ? 'ROAD' : 'DISTRICT';
    const params = { query: q, type: vtype, size: 100, page: 1, format: 'json' };
    // when searching administrative districts, restrict to 읍/면/동/리 level (L4)
    if(vtype === 'DISTRICT') params.category = 'L4';

    setStatus('VWorld로 검색 중...', 'loading');

    try{
      const client = window.vworldClient;
      if(!client) throw new Error('vworldClient not available');
      const resp = await client.searchFeatures(params);
      const items = resp.items || [];
      if(!items.length){
        setStatus('검색 결과가 없습니다.', 'empty');
        return;
      }

      // show popup grid and pass addrType so selection uses correct field
      createModal(items, (selected) => onSelectVworld(selected, q, addrType), q);
      setStatus(`결과 ${items.length}건 - 항목을 선택하세요.`, 'success');
    }catch(err){
      console.error(err);
      resultsEl.innerHTML = '';
      const errDiv = document.createElement('div');
      errDiv.className = 'search-status';
      errDiv.setAttribute('data-tone','error');
      errDiv.textContent = '검색 실패: ' + (err.message || err);
      resultsEl.appendChild(errDiv);

      const hint = document.createElement('div');
      hint.style.marginTop = '8px';
      hint.style.color = '#374151';
      hint.textContent = '브라우저에서 직접 VWorld 호출이 차단될 수 있습니다. (CORS 또는 네트워크 문제)';
      resultsEl.appendChild(hint);

      const mockBtn = document.createElement('button');
      mockBtn.textContent = '샘플 VWorld 결과 보기';
      mockBtn.style.marginTop = '12px';
      mockBtn.onclick = () => {
        const sample = [
          { id:'1168010100', title:'서울특별시 중랑구 면목동', address:{parcel:'면목동', road:'면목로 1'}, point:{x:'127.08',y:'37.59'}, raw:{} },
          { id:'1168010200', title:'서울특별시 중랑구 용마동', address:{parcel:'용마동', road:'용마산로 45'}, point:{x:'127.09',y:'37.58'}, raw:{} }
        ];
        createModal(sample, (selected) => onSelectVworld(selected, q, addrType), q);
      };
      resultsEl.appendChild(mockBtn);
    }
  });

})();