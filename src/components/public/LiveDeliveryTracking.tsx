import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Truck } from "lucide-react";
import { api } from "../../../convex/_generated/api";

const MAPBOX_PUBLIC_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

type TrackingStop = {
  order: number;
  latitude: number | null;
  longitude: number | null;
  done: boolean;
  isRecipient: boolean;
};

function buildRouteGeoJson(
  routeCoordinates: number[][],
  depot?: [number, number] | null,
  recipient?: [number, number] | null,
) {
  const coordinates =
    routeCoordinates.length > 0
      ? routeCoordinates
      : ([depot, recipient].filter(Boolean) as number[][]);
  return {
    type: "FeatureCollection" as const,
    features:
      coordinates.length > 1
        ? [{ type: "Feature" as const, geometry: { type: "LineString" as const, coordinates }, properties: {} }]
        : [],
  };
}

function createTruckMarkerElement() {
  const el = document.createElement("div");
  el.style.cssText =
    "display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:12px;background:#2563eb;box-shadow:0 6px 16px rgba(37,99,235,0.45);border:2px solid #fff";
  el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`;
  return el;
}

function buildBounds(points: Array<[number, number] | null | undefined>, route: number[][] = []) {
  const bounds = new mapboxgl.LngLatBounds();
  let has = false;
  for (const p of points) if (p) { bounds.extend(p); has = true; }
  for (const c of route) if (c.length >= 2) { bounds.extend([c[0], c[1]]); has = true; }
  return has ? bounds : null;
}

function formatAge(updatedAt?: number | null) {
  if (!updatedAt) return { text: "Position non encore partagée", live: false };
  const s = Math.max(0, Math.round((Date.now() - updatedAt) / 1000));
  if (s < 90) return { text: "Position en direct", live: true };
  const m = Math.round(s / 60);
  if (m < 60) return { text: `Mise à jour il y a ${m} min`, live: false };
  return { text: `Mise à jour il y a ${Math.round(m / 60)} h`, live: false };
}

/**
 * Carte de suivi de livraison en temps réel (style Amazon), embarquable
 * partout à partir d'un `token` de partage public.
 */
export function LiveDeliveryTracking({ token }: { token: string }) {
  const tracking = useQuery(api.sorties.getPublicTrackingByToken, { token });
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const truckMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const stopMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const userInteractedRef = useRef(false);
  const [, setTick] = useState(0);

  const depot = useMemo(
    () =>
      tracking?.tournee.depotLongitude != null && tracking?.tournee.depotLatitude != null
        ? ([tracking.tournee.depotLongitude, tracking.tournee.depotLatitude] as [number, number])
        : null,
    [tracking],
  );
  const recipient = useMemo(
    () =>
      tracking?.recipient.longitude != null && tracking?.recipient.latitude != null
        ? ([tracking.recipient.longitude, tracking.recipient.latitude] as [number, number])
        : null,
    [tracking],
  );
  const truck = useMemo(
    () =>
      tracking?.vehicleLocation
        ? ([tracking.vehicleLocation.longitude, tracking.vehicleLocation.latitude] as [number, number])
        : null,
    [tracking],
  );
  const stops: TrackingStop[] = useMemo(() => tracking?.stops ?? [], [tracking]);
  const stopCoords = useMemo(
    () =>
      stops
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => [s.longitude as number, s.latitude as number] as [number, number]),
    [stops],
  );

  useEffect(() => {
    const i = window.setInterval(() => setTick((t) => t + 1), 20_000);
    return () => window.clearInterval(i);
  }, []);

  useEffect(() => {
    if (!MAPBOX_PUBLIC_TOKEN || !mapContainerRef.current || mapRef.current || !tracking) return;
    mapboxgl.accessToken = MAPBOX_PUBLIC_TOKEN;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center: recipient ?? truck ?? depot ?? [2.2, 48.85],
      zoom: 12,
    });
    const map = mapRef.current;

    const markIfUser = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) userInteractedRef.current = true;
    };
    map.on("dragstart", (e) => markIfUser(e));
    map.on("zoomstart", (e) => markIfUser(e as { originalEvent?: unknown }));

    map.on("load", () => {
      map.addSource("route", { type: "geojson", data: buildRouteGeoJson(tracking.tournee.routeCoordinates, depot, recipient) });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#16a34a", "line-width": 5, "line-opacity": 0.9 },
      });

      const marker = new mapboxgl.Marker({ element: createTruckMarkerElement() });
      if (truck) marker.setLngLat(truck).addTo(map);
      truckMarkerRef.current = marker;

      const bounds = buildBounds([depot, recipient, truck, ...stopCoords], tracking.tournee.routeCoordinates);
      if (bounds) map.fitBounds(bounds, { padding: 56, maxZoom: 14 });
    });

    return () => {
      stopMarkersRef.current.forEach((marker) => marker.remove());
      stopMarkersRef.current.clear();
      truckMarkerRef.current?.remove();
      truckMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [depot, recipient, truck, stops, stopCoords, tracking]);

  useEffect(() => {
    if (!mapRef.current || !tracking) return;
    const map = mapRef.current;
    (map.getSource("route") as mapboxgl.GeoJSONSource | undefined)?.setData(
      buildRouteGeoJson(tracking.tournee.routeCoordinates, depot, recipient),
    );
    if (truckMarkerRef.current) {
      if (truck) truckMarkerRef.current.setLngLat(truck).addTo(map);
      else truckMarkerRef.current.remove();
    }

    const desired = new Map<
      string,
      { lngLat: [number, number]; element: HTMLDivElement }
    >();
    if (depot) {
      desired.set("depot", {
        lngLat: depot,
        element: createMapPinElement({ kind: "depot", label: "" }),
      });
    }
    for (const stop of stops) {
      if (stop.latitude == null || stop.longitude == null) continue;
      desired.set(`stop-${stop.order}`, {
        lngLat: [stop.longitude, stop.latitude],
        element: createMapPinElement({
          kind: stop.isRecipient ? "recipient" : stop.done ? "done" : "pending",
          label: String(stop.order),
        }),
      });
    }

    for (const [key, marker] of stopMarkersRef.current.entries()) {
      if (desired.has(key)) continue;
      marker.remove();
      stopMarkersRef.current.delete(key);
    }
    for (const [key, config] of desired.entries()) {
      const existing = stopMarkersRef.current.get(key);
      if (existing) {
        existing.setLngLat(config.lngLat);
        continue;
      }
      stopMarkersRef.current.set(
        key,
        new mapboxgl.Marker({ element: config.element, anchor: "center" })
          .setLngLat(config.lngLat)
          .addTo(map),
      );
    }

    if (!userInteractedRef.current) {
      const bounds = buildBounds([recipient, truck, ...stopCoords], truck ? [] : tracking.tournee.routeCoordinates);
      if (bounds) map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 1200 });
    }
  }, [depot, recipient, truck, stops, stopCoords, tracking]);

  if (!MAPBOX_PUBLIC_TOKEN) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
        Le suivi cartographique n'est pas configuré sur ce déploiement.
      </div>
    );
  }

  const age = formatAge(tracking?.vehicleLocation?.updatedAt ?? null);
  const ahead = tracking?.recipient.stopsAhead ?? 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
        <div className="flex items-center gap-2 text-zinc-900">
          <Truck className="h-4 w-4" />
          <p className="text-sm font-semibold">Suivi en temps réel</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {age.live && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
          <span className={age.live ? "font-semibold text-emerald-600" : "text-zinc-500"}>{age.text}</span>
        </div>
      </div>
      {ahead > 0 ? (
        <p className="px-4 pt-3 text-sm text-zinc-600">
          {ahead} arrêt{ahead > 1 ? "s" : ""} avant le vôtre.
        </p>
      ) : (
        <p className="px-4 pt-3 text-sm font-medium text-amber-600">Vous êtes le prochain arrêt !</p>
      )}
      <div ref={mapContainerRef} className="mt-3 h-[360px] w-full" />
    </div>
  );
}

function createMapPinElement({
  kind,
  label,
}: {
  kind: "depot" | "recipient" | "done" | "pending";
  label: string;
}) {
  const el = document.createElement("div");
  const size = kind === "depot" ? 16 : 30;
  const background =
    kind === "depot"
      ? "#0f766e"
      : kind === "recipient"
        ? "#ef4444"
        : kind === "done"
          ? "#16a34a"
          : "#71717a";
  el.style.cssText = [
    "display:flex",
    "align-items:center",
    "justify-content:center",
    `width:${size}px`,
    `height:${size}px`,
    "border-radius:9999px",
    `background:${background}`,
    "border:3px solid #ffffff",
    "box-shadow:0 8px 18px rgba(24,24,27,0.22)",
    "color:#ffffff",
    kind === "depot" ? "" : "font:700 12px/1 Inter, sans-serif",
  ].join(";");
  el.textContent = label;
  return el;
}
