/* =========================================================================
 * map.js
 * 카카오맵 컨트롤러.
 * - CONFIG 객체로부터 설정을 읽어와 카카오 지도를 초기화하고 제어합니다.
 * ========================================================================= */
const MapController = (() => {
  let kakaoMap = null;
  let markers = [];
  let infoWindow = null;
  let ready = false;
  let onMarkerClick = null;

  // 지도 초기화 함수
  function init(containerId, onClick) {
    onMarkerClick = onClick;
    
    const key = CONFIG.KAKAO_JS_KEY;

    if (!key || key === "YOUR_KAKAO_APP_KEY") {
      console.error("유효한 카카오 지도 API 키가 필요합니다. js/config.js 파일을 확인하세요.");
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = `
          <div class="map-fallback">
            <div class="map-fallback__note">
              <span data-lucide="alert-triangle"></span>
              카카오 지도 API 키가 설정되지 않아 지도를 표시할 수 없습니다.
            </div>
          </div>`;
        if(window.lucide) window.lucide.createIcons();
      }
      return;
    }

    loadKakaoSdk(key, () => {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error("지도 컨테이너(mapArea)를 찾을 수 없습니다.");
        return;
      }
      kakaoMap = new window.kakao.maps.Map(container, {
        center: new window.kakao.maps.LatLng(CONFIG.DEFAULT_CENTER.lat, CONFIG.DEFAULT_CENTER.lng),
        level: CONFIG.DEFAULT_ZOOM,
      });
      infoWindow = new window.kakao.maps.InfoWindow({ zIndex: 1 });
      ready = true;
      console.log("카카오맵 초기화 성공.");
    }, () => {
      console.error("카카오맵 SDK 로드에 실패했습니다. API 키와 네트워크를 확인하세요.");
    });
  }

  // 카카오 지도 SDK 동적 로드
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
        errorCallback();
      }
    };
    script.onerror = errorCallback;
  }

  // 지도 및 마커 초기화
  function clear() {
    if (kakaoMap) {
      markers.forEach((m) => m.setMap(null));
      markers = [];
      if (infoWindow) infoWindow.close();
    }
  }

  // 포인트 데이터를 받아 마커를 렌더링
  function render(points, center) {
    if (!ready) {
      setTimeout(() => render(points, center), 200);
      return;
    }
    clear();

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

  // 특정 마커로 포커스 이동
  function focus(idx, points) {
    const p = points[idx];
    if (!p || !kakaoMap) return;

    const marker = markers[idx];
    if (!marker) return;

    kakaoMap.panTo(new window.kakao.maps.LatLng(p.lat, p.lng));
    infoWindow.setContent(
      `<div style="padding:8px 10px;font-size:12px;max-width:220px;">
         <strong>${escapeHtml(p.name)}</strong><br>${escapeHtml(p.addr)}
       </div>`
    );
    infoWindow.open(kakaoMap, marker);
  }

  return { init, render, clear, focus };
})();

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>'"/]/g, (m) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    }[m];
  });
}
