/* =========================================================================
 * map.js
 * 카카오맵 컨트롤러.
 *  - CONFIG.KAKAO_JS_KEY 가 있으면 카카오 지도 SDK 동적 로드
 *  - 없거나 로드 실패 시 좌표 기반 폴백 지도(스캐터)로 동작
 * ========================================================================= */

const MapController = (() => {
  let kakaoMap = null;
  let markers = [];
  let infoWindow = null;
  let ready = false;
  let mode = "none"; // "kakao" | "fallback"
  let onMarkerClick = null;

  function init(containerId, onClick) {
    onMarkerClick = onClick;
    const key = CONFIG.KAKAO_JS_KEY;
    if (!key) {
      enableFallback(containerId);
      return;
    }
    loadKakaoSdk(key)
      .then(() => {
        window.kakao.maps.load(() => {
          const container = document.getElementById(containerId);
          kakaoMap = new window.kakao.maps.Map(container, {
            center: new window.kakao.maps.LatLng(CONFIG.DEFAULT_CENTER.lat, CONFIG.DEFAULT_CENTER.lng),
            level: CONFIG.DEFAULT_ZOOM,
          });
          infoWindow = new window.kakao.maps.InfoWindow({ zIndex: 1 });
          mode = "kakao";
          ready = true;
        });
      })
      .catch((e) => {
        console.log("[v0] 카카오맵 로드 실패, 폴백 사용:", e.message);
        enableFallback(containerId);
      });
  }

  function loadKakaoSdk(key) {
    return new Promise((resolve, reject) => {
      if (window.kakao && window.kakao.maps) return resolve();
      const script = document.createElement("script");
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("SDK load error"));
      document.head.appendChild(script);
    });
  }

  /* ---------------- 폴백 지도 (키 없을 때) ---------------- */
  let fallbackEl = null;
  function enableFallback(containerId) {
    mode = "fallback";
    ready = true;
    const container = document.getElementById(containerId);
    container.innerHTML = `
      <div class="map-fallback" id="mapFallback">
        <div class="map-fallback__note">
          <span data-lucide="map-pinned"></span>
          카카오맵 키 미설정 — 상대 좌표 미리보기 모드
        </div>
        <div class="map-fallback__plane" id="mapFallbackPlane"></div>
      </div>`;
    fallbackEl = document.getElementById("mapFallbackPlane");
    if (window.lucide) window.lucide.createIcons();
  }

  function clear() {
    if (mode === "kakao") {
      markers.forEach((m) => m.setMap(null));
      markers = [];
      if (infoWindow) infoWindow.close();
    } else if (fallbackEl) {
      fallbackEl.innerHTML = "";
    }
  }

  /* points: [{name, addr, lat, lng}], center: {lat,lng} */
  function render(points, center) {
    if (!ready) {
      setTimeout(() => render(points, center), 200);
      return;
    }
    clear();
    if (mode === "kakao") renderKakao(points, center);
    else renderFallback(points, center);
  }

  function renderKakao(points, center) {
    const bounds = new window.kakao.maps.LatLngBounds();
    points.forEach((p, idx) => {
      const pos = new window.kakao.maps.LatLng(p.lat, p.lng);
      const marker = new window.kakao.maps.Marker({ position: pos, map: kakaoMap });
      window.kakao.maps.event.addListener(marker, "click", () => {
        infoWindow.setContent(
          `<div style="padding:8px 10px;font-size:12px;max-width:220px;">
             <strong>${escapeHtml(p.name)}</strong><br>${escapeHtml(p.addr)}
           </div>`
        );
        infoWindow.open(kakaoMap, marker);
        if (onMarkerClick) onMarkerClick(idx);
      });
      markers.push(marker);
      bounds.extend(pos);
    });
    if (points.length > 0) kakaoMap.setBounds(bounds);
    else if (center) kakaoMap.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng));
  }

  function renderFallback(points, center) {
    if (!fallbackEl || points.length === 0) return;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const padLat = (maxLat - minLat) * 0.15 || 0.01;
    const padLng = (maxLng - minLng) * 0.15 || 0.01;
    points.forEach((p, idx) => {
      const x = ((p.lng - (minLng - padLng)) / (maxLng - minLng + padLng * 2)) * 100;
      const y = (1 - (p.lat - (minLat - padLat)) / (maxLat - minLat + padLat * 2)) * 100;
      const pin = document.createElement("button");
      pin.className = "map-pin";
      pin.style.left = x + "%";
      pin.style.top = y + "%";
      pin.title = `${p.name}\n${p.addr}`;
      pin.innerHTML = `<span data-lucide="map-pin"></span>`;
      pin.addEventListener("click", () => {
        document.querySelectorAll(".map-pin.is-active").forEach((el) => el.classList.remove("is-active"));
        pin.classList.add("is-active");
        if (onMarkerClick) onMarkerClick(idx);
      });
      fallbackEl.appendChild(pin);
    });
    if (window.lucide) window.lucide.createIcons();
  }

  /* 리스트에서 항목 클릭 시 해당 마커 강조/이동 */
  function focus(idx, points) {
    const p = points[idx];
    if (!p) return;
    if (mode === "kakao") {
      const marker = markers[idx];
      if (!marker) return;
      kakaoMap.panTo(new window.kakao.maps.LatLng(p.lat, p.lng));
      infoWindow.setContent(
        `<div style="padding:8px 10px;font-size:12px;max-width:220px;">
           <strong>${escapeHtml(p.name)}</strong><br>${escapeHtml(p.addr)}
         </div>`
      );
      infoWindow.open(kakaoMap, marker);
    } else {
      const pins = fallbackEl.querySelectorAll(".map-pin");
      pins.forEach((el) => el.classList.remove("is-active"));
      if (pins[idx]) pins[idx].classList.add("is-active");
    }
  }

  return { init, render, clear, focus };
})();

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
