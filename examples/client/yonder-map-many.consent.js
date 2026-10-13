(function () {
  let apiLoaded = false;
  let apiLoading = false;
  const initQueue = [];
  const REGION_PRESETS = {
    "Россия": { center: [55.7961, 49.1064], zoom: 5 },
  };
  function getApiUrl(apiKey) {
    let url = "https://api-maps.yandex.ru/2.1/?lang=ru_RU";
    if (apiKey) url += "&apikey=" + encodeURIComponent(apiKey);
    return url;
  }
  // No auto-start: call the existing YMAP_RESCAN with CMP's live permission guard.
  let isAllowed = () => false;
  const observed = new WeakSet();
  function loadYandexApi(apiKey, callback) {
    if (!isAllowed()) return;
    if (apiLoaded) return callback();
    initQueue.push(callback);
    if (apiLoading) return;
    apiLoading = true;
    const ready = () => {
      if (!window.ymaps) { apiLoading = false; initQueue.length = 0; return; }
      ymaps.ready(() => {
        apiLoaded = true;
        apiLoading = false;
        initQueue.splice(0).forEach(fn => { if (isAllowed()) fn(); });
      });
    };
    if (window.ymaps) { ready(); return; }
    const existing = document.querySelector("script[data-ymaps]");
    if (existing) { existing.addEventListener("load", ready, {once:true}); return; }
    if (!isAllowed()) return;
    const script = document.createElement("script");
    script.src = getApiUrl(apiKey);
    script.async = true;
    script.dataset.ymaps = "1";
    script.onload = ready;
    script.onerror = () => { apiLoading = false; initQueue.length = 0; console.warn("[YMAP] API unavailable"); };
    document.head.appendChild(script);
  }
  function disableWheelZoom(map) {
    if (!isAllowed()) return;
    if (!map || !map.behaviors) return;
    map.behaviors.disable("scrollZoom");
  }
  function markReady(el) {
    if (!isAllowed()) return;
    el.classList.add("is-ready");
    el.dataset.inited = "1";
    el.querySelector("[data-cc-js-map-placeholder]")?.remove();
  }
  function parseCoordsString(coordsStr) {
    return coordsStr.split(",").map((s) => Number(String(s).trim())).filter((n) => !Number.isNaN(n));
  }
  function getGeometryFromVar(el) {
    const varName = el.dataset.geometryVar;
    if (!varName) return null;
    const geom = window[varName];
    if (!geom || !geom.type || !geom.coords) return null;
    return geom;
  }
  function buildEndpointUrl(el, params) {
    const endpoint = el.dataset.endpoint || "/assets/components/myyandexcoordstv/mappoints.php";
    const url = new URL(endpoint, window.location.origin);
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });
    return url.toString();
  }
  function addPointPlacemark(map, point) {
    if (!isAllowed()) return;
    const pm = new ymaps.Placemark(point.coords, {
      balloonContent: point.url ? `<a href="${point.url}">${escapeHtml(point.title || "")}</a>` : escapeHtml(point.title || ""),
      hintContent: escapeHtml(point.title || ""),
    }, { preset: "islands#redDotIcon" });
    map.geoObjects.add(pm);
  }
  function escapeHtml(str) {
    return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function initSingleMap(el) {
    if (!isAllowed()) return;
    const zoom = parseInt(el.dataset.zoom || "14", 10);
    const geom = getGeometryFromVar(el);
    let center = null;
    let geoObject = null;
    if (geom && geom.type === "point" && Array.isArray(geom.coords)) center = geom.coords;
    if (!center && el.dataset.coords) {
      const parsed = el.dataset.coords.split(",").map((v) => Number(v.trim()));
      if (parsed.length === 2 && !parsed.some(isNaN)) center = parsed;
    }
    if (!center) {
      console.warn("[YMAP] single map: no valid coords", el);
      markReady(el);
      return;
    }
    const map = new ymaps.Map(el, { center, zoom, controls: ["zoomControl"] });
    disableWheelZoom(map);
    if (geom && geom.type === "point") {
      geoObject = new ymaps.Placemark(center, {}, { preset: "islands#redDotIcon" });
    } else {
      geoObject = new ymaps.Placemark(center, {}, { preset: "islands#redDotIcon" });
    }
    map.geoObjects.add(geoObject);
    markReady(el);
  }
  async function loadPolygons(el, map) {
    if (!isAllowed()) return null;
    const ifnsLabels = [];
    const endpoint = el.dataset.polygonsEndpoint || "/assets/components/myyandexcoordstv/mappolygons.php";
    const root = el.dataset.poligonsParent;
    if (!root) { console.warn("[YMAP] polygons root not set"); return null; }
    const url = new URL(endpoint, location.origin);
    url.searchParams.set("root", root);
    url.searchParams.set("tv", "YandexCoor");
    console.log("[YMAP] FETCH polygons", url.toString());
    const res = await fetch(url);
    const data = await res.json();
    if (!isAllowed()) return null;
    console.log("[YMAP] polygons response:", data);
    if (!Array.isArray(data) || !data.length) return null;
    const polygons = [];
    data.forEach((item) => {
      if (!Array.isArray(item.coords) || item.coords.length < 3) return;
      const polygon = new ymaps.Polygon([item.coords], { hintContent: item.title, balloonContent: item.title }, {
        fillColor: "#c59a6d55", strokeColor: "#8b5a2b", strokeWidth: 2, zIndex: 100,
      });
      map.geoObjects.add(polygon);
      polygons.push(polygon);
      const bounds = polygon.geometry.getBounds();
      if (bounds) {
        const center = ymaps.util.bounds.getCenter(bounds);
        let number = item.title || "";
        number = number.replace(/\D+/g, "");
        if (number) {
          const label = new ymaps.Placemark(center, { iconContent: number, hintContent: item.title }, {
            preset: "islands#circleIcon", iconColor: "#1e88e5", zIndex: 1500,
          });
          map.geoObjects.add(label);
          ifnsLabels.push(label);
        }
      }
    });
    return { polygons, labels: ifnsLabels };
  }
  function setBoundsByPolygons(map, polygons) {
    if (!isAllowed()) return;
    let bounds = null;
    polygons.forEach((p) => {
      const b = p.geometry.getBounds();
      if (!bounds) bounds = b;
      else bounds = [[Math.min(bounds[0][0], b[0][0]), Math.min(bounds[0][1], b[0][1])],
        [Math.max(bounds[1][0], b[1][0]), Math.max(bounds[1][1], b[1][1])]];
    });
    if (bounds) map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
  }
  async function fetchPoints(el, bboxBounds) {
    if (!isAllowed()) return [];
    const parents = el.dataset.parents || "";
    const tv = el.dataset.tv || "YandexCoor";
    const minLat = bboxBounds[0][0], minLng = bboxBounds[0][1], maxLat = bboxBounds[1][0], maxLng = bboxBounds[1][1];
    const url = buildEndpointUrl(el, { parents, tv, minLat, minLng, maxLat, maxLng });
    console.log("[YMAP] FETCH points", url);
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error("Points fetch failed: " + res.status);
    const data = await res.json();
    if (!isAllowed()) return null;
    return Array.isArray(data) ? data : [];
  }
  async function loadPointsIntoMap(el, map) {
    if (!isAllowed()) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    const points = await fetchPoints(el, bounds);
    if (!isAllowed()) return;
    if (!map.__clusterer) {
      map.__clusterer = new ymaps.Clusterer({ preset: "islands#invertedRedClusterIcons", groupByCoordinates: false,
        clusterDisableClickZoom: false, clusterOpenBalloonOnClick: true });
      map.geoObjects.add(map.__clusterer);
    } else { map.__clusterer.removeAll(); }
    points.forEach((p) => {
      const pm = new ymaps.Placemark(p.coords, {
        balloonContent: p.url ? `<a href="${p.url}">${escapeHtml(p.title || "")}</a>` : escapeHtml(p.title || ""),
        hintContent: escapeHtml(p.title || ""),
      }, { preset: "islands#redDotIcon" });
      map.__clusterer.add(pm);
    });
    console.log("[YMAP] points loaded:", points.length);
  }
  function drawGeometryOnMap(el, map) {
    if (!isAllowed()) return;
    const geom = getGeometryFromVar(el);
    if (!geom) return null;
    if (geom.type === "point" && el.dataset.hidePointGeometry === "1") {
      map.setCenter(geom.coords, parseInt(el.dataset.zoom || "11", 10)); return null;
    }
    let geoObject = null;
    if (geom.type === "point") {
      geoObject = new ymaps.Placemark(geom.coords, {}, { preset: "islands#blueDotIcon" });
      map.setCenter(geom.coords, parseInt(el.dataset.zoom || "11", 10));
    } else if (geom.type === "polygon") {
      geoObject = new ymaps.Polygon([geom.coords], {}, { fillColor: "#0000FF22", strokeColor: "#0000FF", strokeWidth: 2 });
      map.geoObjects.add(geoObject);
      map.setBounds(geoObject.geometry.getBounds(), { checkZoomRange: true, zoomMargin: 20 });
      return geoObject;
    } else if (geom.type === "line") {
      geoObject = new ymaps.Polyline(geom.coords, {}, { strokeColor: "#0000FF", strokeWidth: 3 });
      map.geoObjects.add(geoObject);
      map.setBounds(geoObject.geometry.getBounds(), { checkZoomRange: true, zoomMargin: 20 });
      return geoObject;
    } else { console.warn("[YMAP] unknown geometry type:", geom.type); return null; }
    map.geoObjects.add(geoObject);
    return geoObject;
  }
  function initBBoxMap(el) {
    if (!isAllowed()) return;
    let ifnsLabels = [];
    const LABELS_MIN_ZOOM = 11;
    const zoom = parseInt(el.dataset.zoom || "11", 10);
    const defaultCenter = [55.75, 37.62];
    const map = new ymaps.Map(el, { center: defaultCenter, zoom, controls: ["zoomControl"] });
    disableWheelZoom(map);
    map.events.add('boundschange', () => {
      if (!isAllowed() || !ifnsLabels.length) return;
      const zoom = map.getZoom();
      ifnsLabels.forEach(label => { label.options.set('visible', zoom >= LABELS_MIN_ZOOM); });
    });
    (async () => {
      try {
        const result = await loadPolygons(el, map);
        if (!isAllowed()) return;
        if (result && result.polygons && result.polygons.length) {
          if (!el.dataset.zoom) setBoundsByPolygons(map, result.polygons);
        }
        ifnsLabels = result?.labels || [];
        const currentZoom = map.getZoom();
        ifnsLabels.forEach(label => { label.options.set('visible', currentZoom >= LABELS_MIN_ZOOM); });
      } catch (e) { console.error("[YMAP] polygons load error:", e); }
    })();
    const geomObj = drawGeometryOnMap(el, map);
    const doLoad = async () => {
      try { await loadPointsIntoMap(el, map); }
      catch (e) { console.error("[YMAP] load points error:", e); }
      finally { markReady(el); }
    };
    map.events.add("actionend", () => {
      if (!isAllowed() || map.__pointsLoadedOnce) return;
      map.__pointsLoadedOnce = true; doLoad();
    });
    if (!geomObj) {
      setTimeout(() => {
        if (!isAllowed() || map.__pointsLoadedOnce) return;
        map.__pointsLoadedOnce = true; doLoad();
      }, 0);
    }
    map.events.add("boundschange", debounce(() => { doLoad(); }, 250));
    const regionSelect = document.getElementById("region-filter");
    if (regionSelect) {
      const initialRegion = regionSelect.value;
      if (initialRegion) centerMapByRegion(map, el, initialRegion, true);
      regionSelect.addEventListener("change", () => {
        const regionName = regionSelect.value;
        console.log("[YMAP] region change:", regionName);
        centerMapByRegion(map, el, regionName, false);
      });
    }
    if (geomObj && geomObj.geometry && geomObj.geometry.getType() === 'Point') {
      const center = geomObj.geometry.getCoordinates();
      map.setCenter(center, parseInt(el.dataset.zoom || "11", 10)); doLoad(); return;
    }
  }
  function centerMapByRegion(map, el, regionName, isInitial = false) {
    if (!isAllowed()) return;
    if (!regionName) return;
    if (REGION_PRESETS[regionName]) {
      const preset = REGION_PRESETS[regionName];
      map.setCenter(preset.center, preset.zoom);
      setTimeout(async () => {
        if (!isAllowed()) return;
        try { await loadPointsIntoMap(el, map); }
        catch (e) { console.error("[YMAP] region points load error:", e); }
        if (isAllowed() && isInitial) el.classList.add("is-ready");
      }, isInitial ? 0 : 300);
      return;
    }
    ymaps.geocode(regionName + ", Россия", { kind: "province", results: 1 }).then(async (res) => {
      if (!isAllowed()) return;
      const geoObject = res.geoObjects.get(0);
      if (!geoObject) return;
      const bounds = geoObject.properties.get("boundedBy");
      if (!bounds) return;
      map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
      setTimeout(async () => {
        if (!isAllowed()) return;
        if (map.getZoom() < 5) map.setZoom(5);
        try { await loadPointsIntoMap(el, map); }
        catch (e) { console.error("[YMAP] region points load error:", e); }
        if (isAllowed() && isInitial) el.classList.add("is-ready");
      }, isInitial ? 0 : 400);
    });
  }
  function initMapByType(el) {
    if (!isAllowed() || el.dataset.inited) return;
    el.dataset.inited = "1";
    const mapType = el.dataset.mapType || "single";
    console.log("[YMAP] init", { mapType, id: el.id || null });
    if (mapType === "single") return initSingleMap(el);
    if (mapType === "bbox") return initBBoxMap(el);
    console.warn("[YMAP] unknown data-map-type:", mapType, el); markReady(el);
  }
  function observeMaps(stillAllowed) {
    if (typeof stillAllowed === "function") isAllowed = stillAllowed;
    if (!isAllowed()) return;
    const maps = document.querySelectorAll(".js-yandex-map");
    if (!maps.length) return;
    const apiKey = maps[0].dataset.ymapsApiKey || "";
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!isAllowed() || !entry.isIntersecting) return;
        const el = entry.target;
        obs.unobserve(el);
        loadYandexApi(apiKey, () => initMapByType(el));
      });
    }, { rootMargin: "200px 0px", threshold: 0 });
    maps.forEach((el) => { if (!el.dataset.inited && !observed.has(el)) { observed.add(el); observer.observe(el); } });
  }
  // Safe even when this local script finishes loading after DOMContentLoaded or withdrawal.
  window.YMAP_RESCAN = observeMaps;
  function debounce(fn, ms) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }
})();
