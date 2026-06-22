// Main UI glue: handle search form, call vworld and clothing bins clients, render popup and results
(function(){
  const form = document.getElementById('search-form');
  const addressInput = document.getElementById('address');
  const resultsEl = document.getElementById('results');

  function setStatus(message, tone){
    resultsEl.innerHTML = `<div class="search-status" data-tone="${tone||''}">${message}</div>`;
  }

  function createModal(items, onSelect, query){
    // lightweight top-left floating card like sample/popup_ex.png
    const overlay = document.createElement('div');
    overlay.className = 'vmodal-overlay';

    const modal = document.createElement('div');
    modal.className = 'vmodal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-label','행정구역 선택');

    const header = document.createElement('div'); header.className = 'vmodal-header';
    const title = document.createElement('div'); title.className = 'vmodal-title'; title.textContent = '행정구역 선택';
    const closeBtn = document.createElement('button'); closeBtn.className = 'vmodal-close'; closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => document.body.removeChild(overlay);
    header.appendChild(title); header.appendChild(closeBtn);

    const hint = document.createElement('div'); hint.className = 'vmodal-hint'; hint.textContent = `"${query||''}" 검색 결과입니다. 정확한 지역을 선택해 주세요.`;

    const list = document.createElement('div'); list.className = 'vmodal-list';

    items.forEach(it => {
      const itemBtn = document.createElement('button');
      itemBtn.className = 'vmodal-item';

      const left = document.createElement('div'); left.className = 'vmodal-item-left'; left.innerHTML = '📍';
      const right = document.createElement('div'); right.className = 'vmodal-item-right';
      const name = document.createElement('div'); name.className = 'vmodal-item-name'; name.textContent = it.title || (it.address && (it.address.parcel || it.address.road)) || '';
      const sub = document.createElement('div'); sub.className = 'vmodal-item-sub';
      sub.textContent = (it.address && (it.address.road || it.address.parcel)) || '';

      right.appendChild(name); right.appendChild(sub);
      itemBtn.appendChild(left); itemBtn.appendChild(right);

      itemBtn.onclick = () => { document.body.removeChild(overlay); onSelect(it); };
      list.appendChild(itemBtn);
    });

    modal.appendChild(header);
    modal.appendChild(hint);
    modal.appendChild(list);
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