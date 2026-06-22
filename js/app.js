/* =========================================================================
 * app.js
 * 메인 UI 컨트롤러
 * ========================================================================= */

const State = {
  category: CATEGORIES[0],
  searchMode: "road", // "road" | "jibun"
  region: null, // 선택된 지역
  bins: [], // 현재 리스트 데이터
};

document.addEventListener("DOMContentLoaded", () => {
  renderCategoryTabs();
  bindSearchControls();
  bindKeyDialog();
  MapController.init("mapArea", onMarkerClicked);
  refreshKeyBadge();
  if (window.lucide) window.lucide.createIcons();
  updateEmptyState();
});

/* ----------------------------- 카테고리 탭 ----------------------------- */
function renderCategoryTabs() {
  const wrap = document.getElementById("categoryTabs");
  wrap.innerHTML = CATEGORIES.map(
    (c, i) => `
    <button class="cat-tab ${i === 0 ? "is-active" : ""}" data-id="${c.id}" role="tab" aria-selected="${i === 0}">
      <span class="cat-tab__icon" data-lucide="${c.icon}"></span>
      <span class="cat-tab__label">${c.label}</span>
    </button>`
  ).join("");

  wrap.querySelectorAll(".cat-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      State.category = CATEGORIES.find((c) => c.id === id);
      wrap.querySelectorAll(".cat-tab").forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active);
      });
      // 지역이 선택되어 있으면 새 카테고리로 재조회
      if (State.region) loadForRegion();
      else updateEmptyState();
    });
  });
}

/* ----------------------------- 검색 컨트롤 ----------------------------- */
function bindSearchControls() {
  const modeBtns = document.querySelectorAll(".seg-btn");
  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      State.searchMode = btn.dataset.mode;
      modeBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
      const input = document.getElementById("searchInput");
      input.placeholder =
        State.searchMode === "road"
          ? "도로명을 입력하세요 (예: 중앙로, 테헤란로)"
          : "읍/면/동을 입력하세요 (예: 중앙동, 역삼동)";
    });
  });

  const form = document.getElementById("searchForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    doRegionSearch();
  });
}

async function doRegionSearch() {
  const keyword = document.getElementById("searchInput").value.trim();
  if (!keyword) {
    document.getElementById("searchInput").focus();
    return;
  }

  // If clothing category selected, use VWorld search and show the custom modal (two-column preview)
  if (State.category && State.category.id === "clothing" && window.vworldClient) {
    try {
      setRegionDialogLoading(true);
      // build vworld params
      const vtype = State.searchMode === "road" ? "ROAD" : "DISTRICT";
      const resp = await window.vworldClient.searchFeatures({ query: keyword, type: vtype, size: 100 });
      const items = (resp && resp.items) || [];
      setRegionDialogLoading(false);
      if (!items.length) {
        // fallback to existing dialog
        openRegionDialog();
        renderRegionResults([], keyword);
        return;
      }
      // show custom modal using vworld results
      createVWorldModal(items, (selected) => {
        // map selected vworld item into region object compatible with loadForRegion
        const region = {
          type: State.searchMode === "road" ? "road" : "jibun",
          fullName: selected.title || (selected.address && (selected.address.road || selected.address.parcel)) || "",
          sigungu: (selected.address && (selected.address.sigungu || selected.address.sgg || selected.address.region)) || "",
          road: (selected.address && selected.address.road) || "",
          emd: (selected.address && selected.address.parcel) || "",
          lat: selected.point ? parseFloat(selected.point.y) : (selected.raw && selected.raw.y) || 0,
          lng: selected.point ? parseFloat(selected.point.x) : (selected.raw && selected.raw.x) || 0,
        };
        State.region = region;
        loadForRegion();
      }, keyword);
    } catch (e) {
      console.error('VWorld search failed, falling back to default region dialog', e);
      setRegionDialogLoading(false);
      openRegionDialog();
      const regions = await Api.searchRegions(keyword, State.searchMode);
      renderRegionResults(regions, keyword);
    }

    return;
  }

  // default path: use Api.searchRegions (juso or dummy)
  openRegionDialog();
  setRegionDialogLoading(true);
  const regions = await Api.searchRegions(keyword, State.searchMode);
  setRegionDialogLoading(false);
  renderRegionResults(regions, keyword);
}

/* --------------------- 전국 동일 명칭 선택 팝업 --------------------- */
function openRegionDialog() {
  const dlg = document.getElementById("regionDialog");
  dlg.classList.add("is-open");
  dlg.setAttribute("aria-hidden", "false");
}
function closeRegionDialog() {
  const dlg = document.getElementById("regionDialog");
  dlg.classList.remove("is-open");
  dlg.setAttribute("aria-hidden", "true");
}

/* ----------------------------- VWorld Custom Modal ----------------------------- */
function createVWorldModal(items, onSelect, query) {
  // Build modal DOM similar to popup_ex.png (two-column)
  const overlay = document.createElement('div');
  overlay.className = 'vmodal-overlay';

  const modal = document.createElement('div');
  modal.className = 'vmodal vmodal-wide';

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
    const itemBtn = document.createElement('button'); itemBtn.className = 'vmodal-item-row';
    const num = document.createElement('div'); num.className='vmodal-num'; num.textContent = (idx+1);
    const meta = document.createElement('div'); meta.className='vmodal-meta';
    const name = document.createElement('div'); name.className='vmodal-item-name'; name.textContent = it.title || (it.address && (it.address.parcel || it.address.road)) || '';
    const sub = document.createElement('div'); sub.className='vmodal-item-sub'; sub.textContent = (it.address && (it.address.road || it.address.parcel)) || '';
    meta.appendChild(name); meta.appendChild(sub);
    itemBtn.appendChild(num); itemBtn.appendChild(meta);
    itemBtn.addEventListener('click', () => { document.body.removeChild(overlay); onSelect(it); });
    list.appendChild(itemBtn);
  });

  leftCol.appendChild(list);
  const rightCol = document.createElement('div'); rightCol.className='vmodal-right';
  const mapPreview = document.createElement('div'); mapPreview.className='vmodal-map-preview'; mapPreview.textContent='지도 미리보기';
  const markerCard = document.createElement('div'); markerCard.className='vmodal-marker-card'; markerCard.innerHTML = `<div class="mc-num">1</div><div class="mc-text">선택 항목 미리보기<br/><span class="mc-sub">중소형 가전 근처</span></div>`;
  rightCol.appendChild(mapPreview); rightCol.appendChild(markerCard);

  bodyGrid.appendChild(leftCol); bodyGrid.appendChild(rightCol);

  const footer = document.createElement('div'); footer.className='vmodal-footer';
  const info = document.createElement('div'); info.className='vmodal-footer-info'; info.textContent='목록에서 항목을 선택하면 해당 위치의 의류수거함을 조회합니다.';
  footer.appendChild(info);

  modal.appendChild(header); modal.appendChild(subtitle); modal.appendChild(bodyGrid); modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function setRegionDialogLoading(loading) {
  document.getElementById("regionResults").innerHTML = loading
    ? `<li class="region-loading">전국에서 검색 중...</li>`
    : "";
}

function renderRegionResults(regions, keyword) {
  const ul = document.getElementById("regionResults");
  const title = document.getElementById("regionDialogTitle");
  title.textContent = `'${keyword}' 검색결과 ${regions.length}건`;
  if (!regions.length) {
    ul.innerHTML = `<li class="region-empty">일치하는 ${State.searchMode === "road" ? "도로명" : "읍·면·동"}이 없습니다.</li>`;
    return;
  }
  ul.innerHTML = regions
    .map(
      (r, i) => `
      <li>
        <button class="region-item" data-idx="${i}">
          <span class="region-item__name">${escapeHtml(r.displayName)}</span>
          <span class="region-item__addr">${escapeHtml(r.sigungu)}</span>
          <span class="region-item__chevron" data-lucide="chevron-right"></span>
        </button>
      </li>`
    )
    .join("");
  ul.querySelectorAll(".region-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      State.region = regions[+btn.dataset.idx];
      closeRegionDialog();
      loadForRegion();
    });
  });
  if (window.lucide) window.lucide.createIcons();
}

/* ----------------------- 선택 지역 데이터 로딩 ----------------------- */
async function loadForRegion() {
  const region = State.region;
  const category = State.category;
  document.getElementById("selectedRegion").innerHTML = `
    <span data-lucide="map-pin"></span>
    <strong>${escapeHtml(region.fullName)}</strong>
    <span class="badge-cat">${escapeHtml(category.label)}</span>`;
  if (window.lucide) window.lucide.createIcons();

  setListLoading(true);
  if (category.type === "bin") {
    const bins = await Api.fetchBins(region, category);
    State.bins = bins;
    setListLoading(false);
    renderBinList(bins);
    MapController.render(bins, { lat: region.lat, lng: region.lng });
  } else {
    const info = await Api.fetchInfo(region, category);
    State.bins = [];
    setListLoading(false);
    renderInfoList(info, category);
    MapController.render([], { lat: region.lat, lng: region.lng });
  }
}

function setListLoading(loading) {
  const el = document.getElementById("resultList");
  const count = document.getElementById("resultCount");
  if (loading) {
    count.textContent = "조회 중...";
    el.innerHTML = `<li class="list-loading">데이터를 불러오는 중입니다...</li>`;
  }
}

/* ----------------------------- 좌측 리스트 ----------------------------- */
function renderBinList(bins) {
  const el = document.getElementById("resultList");
  const count = document.getElementById("resultCount");
  count.textContent = `검색결과 ${bins.length}건`;
  if (!bins.length) {
    el.innerHTML = `<li class="list-empty">해당 지역의 수거함 정보가 없습니다.</li>`;
    return;
  }
  el.innerHTML = bins
    .map(
      (b, i) => `
      <li class="bin-item" data-idx="${i}" tabindex="0">
        <span class="bin-item__no">${i + 1}</span>
        <span class="bin-item__body">
          <span class="bin-item__name">${escapeHtml(b.name)}</span>
          <span class="bin-item__addr"><span data-lucide="map-pin"></span>${escapeHtml(b.addr)}</span>
        </span>
        <span class="bin-item__go" data-lucide="locate-fixed"></span>
      </li>`
    )
    .join("");
  el.querySelectorAll(".bin-item").forEach((li) => {
    const focusItem = () => {
      el.querySelectorAll(".bin-item.is-active").forEach((x) => x.classList.remove("is-active"));
      li.classList.add("is-active");
      MapController.focus(+li.dataset.idx, State.bins);
    };
    li.addEventListener("click", focusItem);
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        focusItem();
      }
    });
  });
  if (window.lucide) window.lucide.createIcons();
}

function renderInfoList(info, category) {
  const el = document.getElementById("resultList");
  const count = document.getElementById("resultCount");
  count.textContent = `${category.label} ${info.length}건`;
  if (category.id === "bulkyFee") {
    el.innerHTML = info
      .map(
        (it) => `
        <li class="info-item">
          <span class="info-item__title">${escapeHtml(it.item)}</span>
          <span class="info-item__spec">${escapeHtml(it.spec)}</span>
          <span class="info-item__fee">${Number(it.fee).toLocaleString()}원</span>
        </li>`
      )
      .join("");
  } else {
    el.innerHTML = info
      .map(
        (it) => `
        <li class="info-card">
          <span class="info-card__title"><span data-lucide="calendar-clock"></span>${escapeHtml(it.title)}</span>
          <span class="info-card__row"><b>배출요일</b> ${escapeHtml(it.day)}</span>
          <span class="info-card__row"><b>배출시간</b> ${escapeHtml(it.time)}</span>
          <span class="info-card__row"><b>배출방법</b> ${escapeHtml(it.method)}</span>
        </li>`
      )
      .join("");
  }
  if (window.lucide) window.lucide.createIcons();
}

function onMarkerClicked(idx) {
  const el = document.getElementById("resultList");
  const items = el.querySelectorAll(".bin-item");
  items.forEach((x) => x.classList.remove("is-active"));
  if (items[idx]) {
    items[idx].classList.add("is-active");
    items[idx].scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function updateEmptyState() {
  const el = document.getElementById("resultList");
  const count = document.getElementById("resultCount");
  count.textContent = "검색결과 0건";
  el.innerHTML = `
    <li class="list-empty list-empty--intro">
      <span data-lucide="search"></span>
      <p>상단에서 <b>도로명</b> 또는 <b>지번(읍·면·동)</b>을 입력하고<br>조회 버튼을 누르면 결과가 표시됩니다.</p>
    </li>`;
  if (window.lucide) window.lucide.createIcons();
}

/* ----------------------------- API 키 설정 ----------------------------- */
function bindKeyDialog() {
  const openBtn = document.getElementById("openKeyDialog");
  const dlg = document.getElementById("keyDialog");
  const saveBtn = document.getElementById("saveKeys");
  openBtn.addEventListener("click", () => {
    document.getElementById("kakaoKeyInput").value = CONFIG.KAKAO_JS_KEY;
    document.getElementById("dataKeyInput").value = CONFIG.DATA_GO_KR_KEY;
    dlg.classList.add("is-open");
    dlg.setAttribute("aria-hidden", "false");
  });
  saveBtn.addEventListener("click", () => {
    const kakao = document.getElementById("kakaoKeyInput").value.trim();
    const data = document.getElementById("dataKeyInput").value.trim();
    if (kakao) localStorage.setItem("KAKAO_JS_KEY", kakao);
    else localStorage.removeItem("KAKAO_JS_KEY");
    if (data) localStorage.setItem("DATA_GO_KR_KEY", data);
    else localStorage.removeItem("DATA_GO_KR_KEY");
    location.reload();
  });

  // 공통 닫기 버튼
  document.querySelectorAll("[data-close-dialog]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dlg = btn.closest(".dialog");
      dlg.classList.remove("is-open");
      dlg.setAttribute("aria-hidden", "true");
    });
  });
  // 오버레이 클릭 닫기
  document.querySelectorAll(".dialog__overlay").forEach((ov) => {
    ov.addEventListener("click", () => {
      const dlg = ov.closest(".dialog");
      dlg.classList.remove("is-open");
      dlg.setAttribute("aria-hidden", "true");
    });
  });
}

function refreshKeyBadge() {
  const badge = document.getElementById("modeBadge");
  if (CONFIG.USE_DUMMY) {
    badge.textContent = "샘플 데이터 모드";
    badge.className = "mode-badge mode-badge--dummy";
  } else {
    badge.textContent = "OpenAPI 연동 모드";
    badge.className = "mode-badge mode-badge--live";
  }
}
