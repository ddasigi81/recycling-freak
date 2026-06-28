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

  // Robust init function
  function init(containerId, onClick) {
    onMarkerClick = onClick;
    const key = CONFIG.KAKAO_JS_KEY;

    if (!key) {
      console.log("카카오맵 KEY 없음. 폴백 지도를 사용합니다.");
      enableFallback(containerId);
      return;
    }

    const onMapReady = () => {
      try {
        const container = document.getElementById(containerId);
        if (!container) {
          console.error("지도 컨테이너(mapArea)를 찾을 수 없습니다. 폴백 지도를 사용합니다.");
          enableFallback(containerId);
          return;
        }
        kakaoMap = new window.kakao.maps.Map(container, {
          center: new window.kakao.maps.LatLng(CONFIG.DEFAULT_CENTER.lat, CONFIG.DEFAULT_CENTER.lng),
          level: CONFIG.DEFAULT_ZOOM,
        });
        infoWindow = new window.kakao.maps.InfoWindow({ zIndex: 1 });
        mode = "kakao";
        ready = true;
        console.log("카카오맵 초기화 성공.");
      } catch (e) {
        console.error("카카오맵 생성 중 오류 발생. 폴백 지도를 사용합니다.", e);
        enableFallback(containerId);
      }
    };

    const onMapError = () => {
      console.error("카카오맵 SDK 로드 실패. 폴백 지도를 사용합니다.");
      enableFallback(containerId);
    };

    loadKakaoSdk(key, onMapReady, onMapError);
  }

  // Robust SDK loader with callbacks
  function loadKakaoSdk(key, successCallback, errorCallback) {
    if (window.kakao && window.kakao.maps) {
        kakao.maps.load(successCallback);
        return;
    }
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.kakao && window.kakao.maps && typeof window.kakao.maps.load === 'function') {
        window.kakao.maps.load(successCallback);
      } else {
        // Script loaded, but kakao object is not as expected
        errorCallback();
      }
    };
    script.onerror = errorCallback;
  }

  /* ---------------- 폴백 지도 (키 없을 때) ---------------- */
  let fallbackEl = null;
  function enableFallback(containerId) {
    mode = "fallback";
    ready = true;
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="map-fallback" id="mapFallback">
          <div class="map-fallback__note">
            <span data-lucide="map-pinned"></span>
            카카오맵을 불러올 수 없습니다. (API 키 확인 필요)
          </div>
          <div class="map-fallback__plane" id="mapFallbackPlane"></div>
        </div>`;
      fallbackEl = document.getElementById("mapFallbackPlane");
      if (window.lucide) window.lucide.createIcons();
    }
  }

  function clear() {
    if (mode === "kakao" && kakaoMap) {
      markers.forEach((m) => m.setMap(null));
      markers = [];
      if (infoWindow) infoWindow.close();
    } else if (mode === 'fallback' && fallbackEl) {
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
    if (mode === "kakao") {
      renderKakao(points, center);
    } else {
      renderFallback(points, center);
    }
  }

  function renderKakao(points, center) {
    if (!kakaoMap) return;
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
    if (points.length > 0) {
        kakaoMap.setBounds(bounds);
    } else if (center) {
        kakaoMap.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng));
    }
  }

  function renderFallback(points, center) {
    if (!fallbackEl || !points || points.length === 0) return;
    const lats = points.map((p) => p.lat).filter(Boolean);
    const lngs = points.map((p) => p.lng).filter(Boolean);
    if(lats.length === 0) return;

    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat;
    const lngRange = maxLng - minLng;
    const padLat = latRange * 0.15 || 0.01;
    const padLng = lngRange * 0.15 || 0.01;

    points.forEach((p, idx) => {
      if (!p.lat || !p.lng) return; 
      const x = ((p.lng - (minLng - padLng)) / (lngRange + padLng * 2)) * 100;
      const y = (1 - (p.lat - (minLat - padLat)) / (latRange + padLat * 2)) * 100;
      
      if(x < 0 || x > 100 || y < 0 || y > 100) return;

      const pin = document.createElement("button");
      pin.className = "map-pin";
      pin.style.left = x + "%";
      pin.style.top = y + "%";
      pin.title = `${p.name}\n${p.addr}`;
      pin.innerHTML = `<span data-lucide="map-pin"></span>`;
      pin.addEventListener("click", () => {
        const current = fallbackEl.querySelector(".map-pin.is-active");
        if(current) current.classList.remove("is-active");
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
    if (mode === "kakao" && kakaoMap) {
      const marker = markers[idx];
      if (!marker) return;
      kakaoMap.panTo(new window.kakao.maps.LatLng(p.lat, p.lng));
      infoWindow.setContent(
        `<div style="padding:8px 10px;font-size:12px;max-width:220px;">
           <strong>${escapeHtml(p.name)}</strong><br>${escapeHtml(p.addr)}
         </div>`
      );
      infoWindow.open(kakaoMap, marker);
    } else if (mode === 'fallback' && fallbackEl) {
      const pins = fallbackEl.querySelectorAll(".map-pin");
      const current = fallbackEl.querySelector(".map-pin.is-active");
      if(current) current.classList.remove("is-active");
      if (pins[idx]) pins[idx].classList.add("is-active");
    }
  }

  return { init, render, clear, focus };
})();

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
  };
  return str.replace(/[&<>"']/g, m => map[m]);
}
