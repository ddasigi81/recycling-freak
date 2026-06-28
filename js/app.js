/* =========================================================================
 * app.js
 * 메인 UI 컨트롤러
 * ========================================================================= */

const State = {
  category: CATEGORIES[0],
  searchMode: "road",
  searchKeyword: "",
  region: null,
  bins: [],
};

document.addEventListener("DOMContentLoaded", () => {
  renderCategoryTabs();
  bindSearchControls();
  bindKeyDialog();
  MapController.init("mapArea", onMarkerClicked);
  refreshKeyBadge();
  if (window.lucide) {
    window.lucide.createIcons();
  }
  updateEmptyState();
});

function renderCategoryTabs() {
  const wrap = document.getElementById("categoryTabs");
  if (!wrap) return;

  wrap.innerHTML = CATEGORIES.map(
    (c, i) => `
    <button class="cat-tab ${i === 0 ? "is-active" : ""}" data-id="${c.id}" role="tab" aria-selected="${i === 0 ? 'true' : 'false'}">
      <span class="cat-tab__icon" data-lucide="${c.icon}"></span>
      <span class="cat-tab__label">${c.label}</span>
    </button>`
  ).join("");

  const allTabs = wrap.querySelectorAll(".cat-tab");

  allTabs.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      const clickedTab = event.currentTarget;
      const id = clickedTab.dataset.id;
      State.category = CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

      allTabs.forEach(tab => {
        tab.classList.remove("is-active");
        tab.setAttribute("aria-selected", "false");
      });

      clickedTab.classList.add("is-active");
      clickedTab.setAttribute("aria-selected", "true");

      if (State.region) {
        loadForRegion();
      } else {
        updateEmptyState();
      }
    });
  });
  
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function bindSearchControls() {
  const modeBtns = document.querySelectorAll(".seg-btn");
  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      State.searchMode = btn.dataset.mode;
      modeBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
      const input = document.getElementById("searchInput");
      if (input) {
        input.placeholder = State.searchMode === "road"
          ? "도로명을 입력하세요 (예: 중앙로, 테헤란로)"
          : "읍/면/동을 입력하세요 (예: 중앙동, 역삼동)";
      }
    });
  });

  const searchForm = document.getElementById("searchForm");
  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      doRegionSearch();
    });
  }
}

async function doRegionSearch() {
  const input = document.getElementById("searchInput");
  if (!input) return;
  const keyword = input.value.trim();
  if (!keyword) {
    input.focus();
    return;
  }
  State.searchKeyword = keyword;

  openRegionDialog();
  setRegionDialogLoading(true);
  try {
    const regions = await Api.searchRegions(keyword, State.searchMode);
    setRegionDialogLoading(false);
    renderRegionResults(regions, keyword);
  } catch (error) {
    console.error("doRegionSearch: 지역 검색 중 오류 발생:", error);
    setRegionDialogLoading(false);
    renderRegionResults([], keyword); // Show empty result on error
  }
}

function openRegionDialog() {
  const dlg = document.getElementById("regionDialog");
  if (dlg) {
    dlg.classList.add("is-open");
    dlg.setAttribute("aria-hidden", "false");
  }
}

function closeRegionDialog() {
  const dlg = document.getElementById("regionDialog");
  if (dlg) {
    dlg.classList.remove("is-open");
    dlg.setAttribute("aria-hidden", "true");
  }
}

function setRegionDialogLoading(loading) {
  const resultsEl = document.getElementById("regionResults");
  if (resultsEl) {
    resultsEl.innerHTML = loading
    ? `<li class="region-loading">전국에서 검색 중...</li>`
    : "";
  }
}

function renderRegionResults(regions, keyword) {
  const ul = document.getElementById("regionResults");
  const title = document.getElementById("regionDialogTitle");
  
  if (title) {
    title.textContent = `'${keyword}' 검색결과 ${regions.length}건`;
  }
  
  if (!ul) return;

  if (!regions || !regions.length) {
    ul.innerHTML = `<li class="region-empty">일치하는 ${State.searchMode === "road" ? "도로명" : "읍·면·동"}이 없습니다.</li>`;
    return;
  }
  ul.innerHTML = regions.map((r, i) => `
    <li>
      <button class="region-item" data-idx="${i}">
        <span class="region-item__name">${escapeHtml(r.displayName)}</span>
        <span class="region-item__addr">${escapeHtml(r.sigungu)}</span>
        <span class="region-item__chevron" data-lucide="chevron-right"></span>
      </button>
    </li>`
  ).join("");

  ul.querySelectorAll(".region-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx, 10);
      if (regions[idx]) {
        State.region = regions[idx];
        closeRegionDialog();
        loadForRegion();
      }
    });
  });
  if (window.lucide) window.lucide.createIcons();
}

async function loadForRegion() {
  const { region, category, searchKeyword } = State;
  const regionEl = document.getElementById("selectedRegion");
  if (regionEl) {
    regionEl.innerHTML = `
      <span data-lucide="map-pin"></span>
      <strong>${escapeHtml(region.fullName)}</strong>
      <span class="badge-cat">${escapeHtml(category.label)}</span>`;
    if (window.lucide) window.lucide.createIcons();
  }

  setListLoading(true);

  try {
    const allData = await Api.fetchDataForCategory(region, category);
    if (category.type === "bin") {
      const filteredBins = allData.filter(bin => bin.addr && bin.addr.includes(searchKeyword));
      State.bins = filteredBins;
      renderBinList(filteredBins);
      MapController.render(filteredBins, { lat: region.lat, lng: region.lng });
    } else {
      State.bins = [];
      renderInfoList(allData, category);
      MapController.render([], { lat: region.lat, lng: region.lng });
    }
  } catch(error) {
    console.error("Failed to load data for region:", error);
    renderBinList([]); // Clear list on error
  } finally {
    setListLoading(false);
  }
}

function setListLoading(loading) {
  const el = document.getElementById("resultList");
  const count = document.getElementById("resultCount");
  if (loading) {
    if (count) count.textContent = "조회 중...";
    if (el) el.innerHTML = `<li class="list-loading">데이터를 불러오는 중입니다...</li>`;
  }
}

function renderBinList(bins) {
  const el = document.getElementById("resultList");
  const countEl = document.getElementById("resultCount");
  
  if (countEl) countEl.textContent = `검색결과 ${bins.length}건`;
  if (!el) return;

  if (!bins || !bins.length) {
    el.innerHTML = `<li class="list-empty">해당 조건의 수거함 정보가 없습니다.</li>`;
    return;
  }
  el.innerHTML = bins.map((b, i) => `
    <li class="bin-item" data-idx="${i}" tabindex="0">
      <span class="bin-item__no">${i + 1}</span>
      <div class="bin-item__body">
        <span class="bin-item__name">${escapeHtml(b.name)}</span>
        <span class="bin-item__addr"><span data-lucide="map-pin"></span>${escapeHtml(b.addr)}</span>
      </div>
      <button class="bin-item__go" aria-label="지도로 보기"><span data-lucide="locate-fixed"></span></button>
    </li>`
  ).join("");

  el.querySelectorAll(".bin-item").forEach((li) => {
    const idx = parseInt(li.dataset.idx, 10);
    const focusItem = () => {
      const currentActive = el.querySelector(".bin-item.is-active");
      if (currentActive) currentActive.classList.remove("is-active");
      li.classList.add("is-active");
      MapController.focus(idx, State.bins);
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
  const countEl = document.getElementById("resultCount");

  if (countEl) countEl.textContent = `${category.label} ${info.length}건`;
  if (!el) return;

  if (!info || !info.length) {
      el.innerHTML = `<li class="list-empty">관련 정보가 없습니다.</li>`;
      return;
  }
  
  if (category.id === "bulkyFee") {
    el.innerHTML = info.map(it => `
      <li class="info-item">
        <span class="info-item__title">${escapeHtml(it.item)}</span>
        <span class="info-item__spec">${escapeHtml(it.spec)}</span>
        <span class="info-item__fee">${(Number(it.fee) || 0).toLocaleString()}원</span>
      </li>`).join("");
  } else {
    el.innerHTML = info.map(it => `
      <li class="info-card">
        <span class="info-card__title"><span data-lucide="calendar-clock"></span>${escapeHtml(it.title)}</span>
        <span class="info-card__row"><b>배출요일</b> ${escapeHtml(it.day)}</span>
        <span class="info-card__row"><b>배출시간</b> ${escapeHtml(it.time)}</span>
        <span class="info-card__row"><b>배출방법</b> ${escapeHtml(it.method)}</span>
      </li>`).join("");
  }
  if (window.lucide) window.lucide.createIcons();
}

function onMarkerClicked(idx) {
  const item = document.querySelector(`.bin-item[data-idx="${idx}"]`);
  if (item) {
    const currentActive = document.querySelector(".bin-item.is-active");
    if (currentActive) currentActive.classList.remove("is-active");
    item.classList.add("is-active");
    item.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function updateEmptyState() {
  const countEl = document.getElementById("resultCount");
  const listEl = document.getElementById("resultList");

  if (countEl) countEl.textContent = "검색결과 0건";
  if (listEl) {
    listEl.innerHTML = `
    <li class="list-empty list-empty--intro">
      <span data-lucide="search"></span>
      <p>상단에서 <b>도로명</b> 또는 <b>지번(읍·면·동)</b>을 입력하고<br>조회 버튼을 누르면 결과가 표시됩니다.</p>
    </li>`;
  }
  if (window.lucide) window.lucide.createIcons();
}

function bindKeyDialog() {
  const openBtn = document.getElementById("openKeyDialog");
  const dlg = document.getElementById("keyDialog");
  const saveBtn = document.getElementById("saveKeys");
  const closeBtns = document.querySelectorAll("[data-close-dialog], .dialog__overlay");

  if (!openBtn || !dlg || !saveBtn) return;

  openBtn.addEventListener("click", () => {
    const kakaoInput = document.getElementById("kakaoKeyInput");
    const clothingInput = document.getElementById("clothingKeyInput");
    const dataInput = document.getElementById("dataKeyInput");

    if (kakaoInput) kakaoInput.value = localStorage.getItem("KAKAO_JS_KEY") || "";
    if (clothingInput) clothingInput.value = localStorage.getItem("CLOTHING_COLLECT_BINS_API_KEY") || "";
    if (dataInput) dataInput.value = localStorage.getItem("DATA_GO_KR_KEY") || "";
    
    dlg.classList.add("is-open");
    dlg.setAttribute("aria-hidden", "false");
  });

  saveBtn.addEventListener("click", () => {
    const kakaoInput = document.getElementById("kakaoKeyInput");
    const clothingInput = document.getElementById("clothingKeyInput");
    const dataInput = document.getElementById("dataKeyInput");

    if (kakaoInput) localStorage.setItem("KAKAO_JS_KEY", kakaoInput.value.trim());
    if (clothingInput) localStorage.setItem("CLOTHING_COLLECT_BINS_API_KEY", clothingInput.value.trim());
    if (dataInput) localStorage.setItem("DATA_GO_KR_KEY", dataInput.value.trim());
    
    location.reload();
  });

  closeBtns.forEach(btn => btn.addEventListener("click", (e) => {
    const aDialog = e.currentTarget.closest(".dialog");
    if (aDialog) {
        aDialog.classList.remove("is-open");
        aDialog.setAttribute("aria-hidden", "true");
    }
  }));
}

function refreshKeyBadge() {
  const badge = document.getElementById("modeBadge");
  if (!badge) return;

  if (CONFIG.USE_DUMMY) {
    badge.textContent = "샘플 데이터 모드";
    badge.className = "mode-badge mode-badge--dummy";
  } else {
    badge.textContent = "OpenAPI 연동 모드";
    badge.className = "mode-badge mode-badge--live";
  }
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };
  return str.replace(/[&<>"'/]/g, (m) => map[m]);
}
