import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useConvex, useQuery } from "convex/react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { CheckCircle2, Clock, MapPin, Radio, Truck, XCircle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

const MAPBOX_PUBLIC_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const TOUR_STATUS_CONFIG = {
  planifiee: {
    label: "Passage prévu",
    description: "La collecte est planifiée. Le camion n'est pas encore en route.",
    color: "bg-sky-500/15 text-sky-500 border-sky-500/20",
    icon: Clock,
  },
  en_cours: {
    label: "Tournée en cours",
    description: "Le camion est en route. Suivez sa position en temps réel.",
    color: "bg-amber-500/15 text-amber-500 border-amber-500/20",
    icon: Truck,
  },
  terminee: {
    label: "Tournée terminée",
    description: "La tournée de collecte est terminée.",
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
    icon: CheckCircle2,
  },
  annulee: {
    label: "Tournée annulée",
    description: "Cette tournée a été annulée. Contactez-nous pour plus d'informations.",
    color: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    icon: XCircle,
  },
};

function formatTrackingAge(updatedAt?: number | null): { text: string; isLive: boolean } {
  if (!updatedAt) return { text: "Le camion n'a pas encore partagé sa position.", isLive: false };
  const diffSeconds = Math.max(0, Math.round((Date.now() - updatedAt) / 1000));
  if (diffSeconds < 90) return { text: "Position en direct", isLive: true };
  const minutes = Math.round(diffSeconds / 60);
  if (minutes < 60) return { text: `Mise à jour il y a ${minutes} min`, isLive: false };
  const hours = Math.round(minutes / 60);
  return { text: `Mise à jour il y a ${hours} h`, isLive: false };
}

function formatDuration(durationSeconds?: number | null) {
  if (!durationSeconds) return null;
  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${totalMinutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes.toString().padStart(2, "0")}`;
}

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
        ? [
            {
              type: "Feature" as const,
              geometry: { type: "LineString" as const, coordinates },
              properties: {},
            },
          ]
        : [],
  };
}

type TrackingStop = {
  order: number;
  latitude: number | null;
  longitude: number | null;
  done: boolean;
  isRecipient: boolean;
};

function createTruckMarkerElement() {
  const el = document.createElement("div");
  el.style.cssText = [
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "width:38px",
    "height:38px",
    "border-radius:12px",
    "background:#2563eb",
    "box-shadow:0 6px 16px rgba(37,99,235,0.45)",
    "border:2px solid #ffffff",
    "cursor:default",
  ].join(";");
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
      <path d="M15 18H9"/>
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
      <circle cx="7" cy="18" r="2"/>
      <circle cx="17" cy="18" r="2"/>
    </svg>`;
  return el;
}

function buildContextBounds(
  points: Array<[number, number] | null | undefined>,
  routeCoordinates: number[][] = [],
) {
  const bounds = new mapboxgl.LngLatBounds();
  let hasPoint = false;
  for (const point of points) {
    if (point) {
      bounds.extend(point);
      hasPoint = true;
    }
  }
  for (const coord of routeCoordinates) {
    if (coord.length >= 2) {
      bounds.extend([coord[0], coord[1]]);
      hasPoint = true;
    }
  }
  return hasPoint ? bounds : null;
}

export function TourneeTracking() {
  const { token } = useParams<{ token: string }>();
  const convex = useConvex();
  const subscribedTracking = useQuery(
    api.sorties.getPublicTrackingByToken,
    token ? { token } : "skip",
  );
  const [polledTracking, setPolledTracking] = useState<typeof subscribedTracking>(undefined);
  const tracking = polledTracking === undefined ? subscribedTracking : polledTracking;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const truckMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const stopMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [, setNowTick] = useState(0);

  const depotCoordinates = useMemo(
    () =>
      tracking?.tournee.depotLongitude != null && tracking?.tournee.depotLatitude != null
        ? ([tracking.tournee.depotLongitude, tracking.tournee.depotLatitude] as [
            number,
            number,
          ])
        : null,
    [tracking],
  );
  const recipientCoordinates = useMemo(
    () =>
      tracking?.recipient.longitude != null && tracking?.recipient.latitude != null
        ? ([tracking.recipient.longitude, tracking.recipient.latitude] as [number, number])
        : null,
    [tracking],
  );
  const truckCoordinates = useMemo(
    () =>
      tracking?.vehicleLocation
        ? ([tracking.vehicleLocation.longitude, tracking.vehicleLocation.latitude] as [
            number,
            number,
          ])
        : null,
    [tracking],
  );
  const stops: TrackingStop[] = useMemo(() => tracking?.stops ?? [], [tracking]);
  const stopCoordinates = useMemo(
    () =>
      stops
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => [s.longitude as number, s.latitude as number] as [number, number]),
    [stops],
  );
  const isTrackingVisible = tracking?.tournee.status === "en_cours";

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setPolledTracking(undefined);

    const refreshTracking = async () => {
      try {
        const latest = await convex.query(api.sorties.getPublicTrackingByToken, { token });
        if (!cancelled) setPolledTracking(latest);
      } catch {
        /* Convex subscriptions keep the last known state if a poll fails. */
      }
    };

    void refreshTracking();
    const interval = window.setInterval(refreshTracking, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [convex, token]);

  // Refresh relative time labels / live status every 20s.
  useEffect(() => {
    const interval = window.setInterval(() => setNowTick((tick) => tick + 1), 20_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (
      !MAPBOX_PUBLIC_TOKEN ||
      !mapContainerRef.current ||
      mapRef.current ||
      !tracking ||
      !isTrackingVisible
    ) return;

    mapboxgl.accessToken = MAPBOX_PUBLIC_TOKEN;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center: recipientCoordinates ?? truckCoordinates ?? depotCoordinates ?? [2.2, 48.85],
      zoom: 12,
    });

    const map = mapRef.current;

    map.on("load", () => {
      map.addSource("route", {
        type: "geojson",
        data: buildRouteGeoJson(
          tracking.tournee.routeCoordinates,
          depotCoordinates,
          recipientCoordinates,
        ),
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#16a34a", "line-width": 5, "line-opacity": 0.9 },
      });

      // Blue truck marker (Mapbox On-Demand Logistics style).
      const truckMarker = new mapboxgl.Marker({ element: createTruckMarkerElement() });
      if (truckCoordinates) {
        truckMarker.setLngLat(truckCoordinates).addTo(map);
      }
      truckMarkerRef.current = truckMarker;

      if (truckCoordinates) {
        map.jumpTo({ center: truckCoordinates, zoom: 15 });
      } else {
        const bounds = buildContextBounds(
          [depotCoordinates, recipientCoordinates, ...stopCoordinates],
          tracking.tournee.routeCoordinates,
        );
        if (bounds) {
          map.fitBounds(bounds, { padding: 64, maxZoom: 14 });
        }
      }
    });

    return () => {
      stopMarkersRef.current.forEach((marker) => marker.remove());
      stopMarkersRef.current.clear();
      truckMarkerRef.current?.remove();
      truckMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [depotCoordinates, recipientCoordinates, truckCoordinates, isTrackingVisible, tracking]);

  // Live updates: refresh sources + truck marker, and follow the truck unless
  // the user has taken control of the map (Amazon-style behaviour).
  useEffect(() => {
    if (!mapRef.current || !tracking || !isTrackingVisible) return;
    const map = mapRef.current;

    (map.getSource("route") as mapboxgl.GeoJSONSource | undefined)?.setData(
      buildRouteGeoJson(
        tracking.tournee.routeCoordinates,
        depotCoordinates,
        recipientCoordinates,
      ),
    );

    if (truckMarkerRef.current) {
      if (truckCoordinates) {
        truckMarkerRef.current.setLngLat(truckCoordinates).addTo(map);
      } else {
        truckMarkerRef.current.remove();
      }
    }

    const desired = new Map<
      string,
      { lngLat: [number, number]; element: HTMLDivElement }
    >();
    if (depotCoordinates) {
      desired.set("depot", {
        lngLat: depotCoordinates,
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

    if (truckCoordinates) {
      map.easeTo({ center: truckCoordinates, zoom: 15, duration: 900 });
    } else {
      const bounds = buildContextBounds(
        [recipientCoordinates, ...stopCoordinates],
        tracking.tournee.routeCoordinates,
      );
      if (bounds) {
        map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 1200 });
      }
    }
  }, [depotCoordinates, recipientCoordinates, truckCoordinates, isTrackingVisible, stops, stopCoordinates, tracking]);

  if (tracking === undefined) {
    return <FullSpinner label="Chargement du suivi…" />;
  }

  if (!tracking) {
    return (
      <div className="mx-auto w-full max-w-4xl px-5 py-16">
        <EmptyState
          icon={<MapPin className="h-10 w-10" />}
          title="Lien de suivi introuvable"
          description="Le lien de suivi semble invalide ou n'est plus disponible."
          action={
            <Link to="/boutique" className="font-medium text-brand-600">
              Retour au site
            </Link>
          }
        />
      </div>
    );
  }

  if (!MAPBOX_PUBLIC_TOKEN) {
    return (
      <div className="mx-auto w-full max-w-4xl px-5 py-16">
        <EmptyState
          icon={<MapPin className="h-10 w-10" />}
          title="Carte indisponible"
          description="Le suivi cartographique n'est pas encore configuré sur ce déploiement."
        />
      </div>
    );
  }

  const status = tracking.tournee.status as keyof typeof TOUR_STATUS_CONFIG;
  const statusConfig = TOUR_STATUS_CONFIG[status] ?? TOUR_STATUS_CONFIG.planifiee;
  const StatusIcon = statusConfig.icon;
  const trackingAge = formatTrackingAge(tracking.vehicleLocation?.updatedAt ?? null);
  const { stopsAhead, stopOrder, totalStops, stopStatus } = tracking.recipient;
  const isCompleted = stopStatus === "effectue";
  const isTourActive = status === "en_cours";
  const isTourDone = status === "terminee" || status === "annulee";

  if (!isTourActive) {
    return (
      <div className="mx-auto w-full max-w-4xl px-5 py-16">
        <section className="rounded-[24px] border border-zinc-200 bg-white p-6 text-center shadow-[0_20px_60px_rgba(24,24,27,0.08)]">
          <Clock className="mx-auto h-10 w-10 text-sky-500" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
            Suivi de collecte
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-zinc-950">
            Suivi bientôt disponible
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            La carte en temps réel s'affichera automatiquement dès que le conducteur démarrera la tournée.
          </p>
          <div className={`mx-auto mt-5 inline-flex items-start gap-3 rounded-2xl border px-4 py-3 text-left ${statusConfig.color}`}>
            <StatusIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{statusConfig.label}</p>
              <p className="mt-0.5 text-xs opacity-80">{statusConfig.description}</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-7 sm:py-8 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Info panel */}
        <section className="flex flex-col gap-4 rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_20px_60px_rgba(24,24,27,0.08)] sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
              Suivi de collecte
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              {tracking.recipient.contactName || "Votre passage"}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{tracking.recipient.address}</p>
          </div>

          {/* Tour status banner */}
          <div className={`flex items-start gap-3 rounded-2xl border p-4 ${statusConfig.color}`}>
            <StatusIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">{statusConfig.label}</p>
              <p className="text-xs mt-0.5 opacity-80">{statusConfig.description}</p>
            </div>
          </div>

          {/* "You're next" highlight — Amazon-style heads up */}
          {isTourActive && !isCompleted && stopsAhead === 0 && (
            <div className="overflow-hidden rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-500/10 to-amber-500/5 p-4">
              <div className="flex items-center gap-2 text-brand-700">
                <Truck className="h-5 w-5 shrink-0" />
                <p className="text-base font-bold">Vous êtes le prochain arrêt&nbsp;!</p>
              </div>
              <p className="mt-1.5 text-sm text-zinc-600">
                Notre véhicule se dirige vers vous. Merci de préparer les objets à collecter,
                de faciliter l'accès (portail, stationnement) et de tenir vos animaux à l'écart
                pour que tout se passe au mieux.
              </p>
            </div>
          )}

          {/* Stop position */}
          {totalStops > 0 && (
            <div className="rounded-2xl bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Votre passage
              </p>
              <p className="mt-1 text-lg font-bold text-zinc-950">
                Arrêt N°{stopOrder}
                <span className="text-sm font-normal text-zinc-400"> sur {totalStops}</span>
              </p>
              {isCompleted ? (
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Passage effectué
                </p>
              ) : isTourActive && stopsAhead === 0 ? (
                <p className="mt-1 text-sm font-medium text-amber-600">
                  Le camion arrive bientôt chez vous
                </p>
              ) : isTourActive && stopsAhead > 0 ? (
                <p className="mt-1 text-sm text-zinc-500">
                  {stopsAhead} arrêt{stopsAhead > 1 ? "s" : ""} avant le vôtre
                </p>
              ) : null}
            </div>
          )}

          {/* Tournée info */}
          <div className="rounded-2xl bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Tournée
            </p>
            <p className="mt-1 text-base font-semibold text-zinc-950">{tracking.tournee.label}</p>
            <p className="mt-0.5 text-sm text-zinc-500">
              {new Date(tracking.tournee.date).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </p>
            {(tracking.tournee.estimatedDistanceMeters ||
              tracking.tournee.estimatedDurationSeconds) && (
              <p className="mt-1 text-xs text-zinc-400">
                {tracking.tournee.estimatedDistanceMeters
                  ? `${(tracking.tournee.estimatedDistanceMeters / 1000).toFixed(1).replace(".", ",")} km`
                  : ""}
                {tracking.tournee.estimatedDistanceMeters &&
                tracking.tournee.estimatedDurationSeconds
                  ? " · "
                  : ""}
                {tracking.tournee.estimatedDurationSeconds
                  ? formatDuration(tracking.tournee.estimatedDurationSeconds)
                  : ""}
              </p>
            )}
          </div>

          {/* Vehicle location */}
          {!isTourDone && (
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="flex items-center gap-2 text-zinc-950">
                <Radio className="h-4 w-4" />
                <p className="text-sm font-semibold">Position du camion</p>
                {trackingAge.isLive && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    En direct
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-zinc-600">{trackingAge.text}</p>
            </div>
          )}
        </section>

        {/* Map */}
        <section className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(24,24,27,0.08)]">
          <div ref={mapContainerRef} className="h-72 w-full sm:h-96 lg:h-full lg:min-h-[500px]" />
        </section>
      </div>
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
