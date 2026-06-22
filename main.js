// Main UI glue: handle search form, call vworld and clothing bins clients, render popup and results
(function(){
  const form = document.getElementById('search-form');
  const addressInput = document.getElementById('address');
  const resultsEl = document.getElementById('results');

  function setStatus(message, tone){
    resultsEl.innerHTML = `<div class="search-status" data-tone="${tone||''}">${message}</div>`;
  }

  function createModal(items, onSelect){
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.4)';
    overlay.style.display = 'grid';
    overlay.style.placeItems = 'center';
    overlay.style.zIndex = 9999;

    const box = document.createElement('div');
    box.style.width = 'min(920px,96vw)';
    box.style.maxHeight = '80vh';
    box.style.overflow = 'auto';
    box.style.background = '#fff';
    box.style.borderRadius = '10px';
    box.style.padding = '18px';

    const h = document.createElement('h3');
    h.textContent = '검색 결과 - 선택하세요';
    box.appendChild(h);

    const grid = document.createElement('div');
    grid.className = 'results-grid';

    // headings
    const headings = ['명칭 / 주소','id','위도','경도'];
    headings.forEach(hn => {
      const cell = document.createElement('div');
      cell.className = 'result-grid-cell result-grid-heading';
      cell.textContent = hn;
      grid.appendChild(cell);
    });

    items.forEach(it => {
      const nameCell = document.createElement('div');
      nameCell.className = 'result-grid-cell';
      nameCell.textContent = it.title || (it.address && (it.address.parcel || it.address.road)) || '';
      grid.appendChild(nameCell);

      const idCell = document.createElement('div');
      idCell.className = 'result-grid-cell';
      idCell.textContent = it.id || '';
      grid.appendChild(idCell);

      const y = (it.point && it.point.y) ? it.point.y : (it.raw && it.raw.point && it.raw.point.y) || '';
      const x = (it.point && it.point.x) ? it.point.x : (it.raw && it.raw.point && it.raw.point.x) || '';
      const latCell = document.createElement('div'); latCell.className='result-grid-cell'; latCell.textContent = y;
      const lonCell = document.createElement('div'); lonCell.className='result-grid-cell'; lonCell.textContent = x;
      grid.appendChild(latCell);
      grid.appendChild(lonCell);

      const rowBtn = document.createElement('button');
      rowBtn.textContent = '선택';
      rowBtn.style.gridColumn = 'span 4';
      rowBtn.style.margin = '8px 0 0';
      rowBtn.onclick = () => {
        document.body.removeChild(overlay);
        onSelect(it);
      };
      // wrap button in a cell
      const btnCell = document.createElement('div'); btnCell.className='result-grid-cell'; btnCell.style.borderRight='0'; btnCell.appendChild(rowBtn);
      // to keep grid columns consistent, add 3 empty placeholder cells then button cell
      // but simpler: append three empty cells and then button cell
      // we already added 4 columns, so append placeholder to align
      // (not necessary for functionality)
      // insert below
      grid.appendChild(document.createElement('div'));
      grid.appendChild(document.createElement('div'));
      grid.appendChild(document.createElement('div'));
      grid.appendChild(btnCell);
    });

    box.appendChild(grid);

    const close = document.createElement('button');
    close.textContent = '닫기';
    close.style.marginTop = '12px';
    close.onclick = () => document.body.removeChild(overlay);
    box.appendChild(close);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function renderClothingResults(items){
    if(!Array.isArray(items) || items.length === 0){
      setStatus('검색된 의류수거함이 없습니다.', 'empty');
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'results-grid';

    const headers = ['관리번호','설치장소','시도','시군구','도로명주소','지번주소','위치(위도,경도)'];
    headers.forEach(h => { const c = document.createElement('div'); c.className='result-grid-cell result-grid-heading'; c.textContent = h; grid.appendChild(c); });

    items.forEach(it => {
      const cells = [];
      cells.push(it.MNG_NO || '');
      cells.push(it.INSTL_PLC_NM || '');
      cells.push(it.CTPV_NM || '');
      cells.push(it.SGG_NM || '');
      cells.push(it.LCTN_ROAD_NM_ADDR || '');
      cells.push(it.LCTN_LOTNO_ADDR || '');
      const coord = ((it.LAT && it.LOT) ? `${it.LAT}, ${it.LOT}` : '');
      cells.push(coord);

      cells.forEach(text => { const c = document.createElement('div'); c.className='result-grid-cell'; c.setAttribute('data-row','1'); c.textContent = text; grid.appendChild(c); });
    });

    resultsEl.innerHTML = '';
    const headerWrap = document.createElement('div'); headerWrap.className='results-header';
    const h2 = document.createElement('h2'); h2.textContent = `의류수거함 ${items.length}건`; headerWrap.appendChild(h2);
    const count = document.createElement('div'); count.className='result-count'; count.textContent = `${items.length}`; headerWrap.appendChild(count);
    resultsEl.appendChild(headerWrap);
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
    const addrType = (document.querySelector('select[name="addressType"]') || {}).value || 'road';
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
      createModal(items, (selected) => onSelectVworld(selected, q, addrType));
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
        createModal(sample, (selected) => onSelectVworld(selected, q, addrType));
      };
      resultsEl.appendChild(mockBtn);
    }
  });

})();