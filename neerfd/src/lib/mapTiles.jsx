import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { extendLeaflet } from "@india-boundary-corrector/leaflet-layer";

/**
 * Map tile layer — ISRO Bhuvan WMS (primary) with corrected-OSM fallback,
 * plus the official India boundary GeoJSON overlay on top.
 *
 * Bhuvan's GeoWebCache only serves grid-aligned EPSG:4326 resolutions — so
 * every MapContainer using this layer MUST set crs={L.CRS.EPSG4326} (already
 * done in all three workspace maps). If Bhuvan is slow/down, repeated tile
 * errors swap the layer to boundary-corrected OSM so the demo never shows a
 * blank map.
 */

extendLeaflet(L);

const BHUVAN_WMS_URL = "https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/wms/";

const BHUVAN_WMS_PROPS = {
  layers: "mmi:mmi_india",
  format: "image/png",
  transparent: true,
  version: "1.1.1",
  attribution: '© <a href="https://bhuvan.nrsc.gov.in">ISRO Bhuvan</a>',
};

const OSM_PROPS = {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  maxZoom: 18,
  fallbackOnCorrectionFailure: true,
};

// Official India boundary (Survey-of-India-aligned, datameet). ~3 MB first
// fetch, then browser-cached; each map builds its own layer from the shared
// raw data (a Leaflet layer instance can't live on two maps at once).
const INDIA_BOUNDARY_URL =
  "https://raw.githubusercontent.com/datameet/maps/master/Country/india-composite.geojson";
let boundaryDataPromise = null;

function getIndiaBoundaryData() {
  if (!boundaryDataPromise) {
    boundaryDataPromise = fetch(INDIA_BOUNDARY_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .catch((err) => {
        console.warn("[mapTiles] India boundary overlay unavailable:", err?.message);
        boundaryDataPromise = null; // retry next map mount
        return null;
      });
  }
  return boundaryDataPromise;
}

// India center — showcase fallback view.
export const INDIA_CENTER = [20.5937, 78.9629];
export const INDIA_ZOOM = 5;

// Swap to OSM after this many failed tiles with no successful one.
const TILE_ERROR_THRESHOLD = 4;

export function AdaptiveTileLayer(props = {}) {
  const map = useMap();
  const { eventHandlers, ...rest } = props;
  const handlersRef = useRef(eventHandlers);
  handlersRef.current = eventHandlers;

  const layers = useMemo(() => {
    const bhuvan = L.tileLayer.wms(BHUVAN_WMS_URL, { ...BHUVAN_WMS_PROPS, ...rest });
    const osm = L.tileLayer.indiaBoundaryCorrected(OSM_PROPS.url, { ...OSM_PROPS, ...rest });

    let successes = 0;
    let errors = 0;
    let swapped = false;

    const onSuccess = () => {
      successes += 1;
    };
    const onError = () => {
      if (swapped || successes > 0) return;
      errors += 1;
      if (errors >= TILE_ERROR_THRESHOLD) {
        swapped = true;
        map.removeLayer(bhuvan);
        osm.addTo(map);
      }
    };

    bhuvan.on("tileload", onSuccess);
    bhuvan.on("tileerror", onError);
    return { bhuvan, osm };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rest), map]);

  useEffect(() => {
    const { bhuvan, osm } = layers;

    // Base layer — OSM neeche (ocean + terrain detail)
    const base = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenStreetMap contributors', maxZoom: 18 }
    );

    base.addTo(map);   // pehle base
    bhuvan.addTo(map); // Bhuvan boundary upar

    return () => {
      map.removeLayer(base);
      map.removeLayer(bhuvan);
      map.removeLayer(osm);
    };
  }, [map, layers]);

  // Official India boundary on top of the raster tiles, every map.
  useEffect(() => {
    let layer = null;
    let cancelled = false;
    getIndiaBoundaryData().then((data) => {
      if (cancelled || !data) return;
      layer = L.geoJSON(data, {
        style: { color: "#646363", weight: 2, fillOpacity: 0 },
        interactive: false,
      });
      layer.addTo(map);
    });
    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map]);

  useEffect(() => {
    const handlers = handlersRef.current;
    if (!handlers) return;
    layers.bhuvan.on(handlers);
    return () => layers.bhuvan.off(handlers);
  }, [layers, eventHandlers]);

  return null;
}
