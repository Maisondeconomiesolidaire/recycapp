import { useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
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

function buildPinsGeoJson({
  depot,
  recipient,
}: {
  depot?: [number, number] | null;
  recipient?: [number, number] | null;
}) {
  return {
    type: "FeatureCollection" as const,
    features: [
      depot
        ? {
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: depot },
            properties: { kind: "depot", label: "Départ recyclerie" },
          }
        : null,
      recipient
        ? {
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: recipient },
            properties: { kind: "recipient", label: "Votre adresse" },
          }
        : null,
    ].filter(Boolean),
  };
}

function buildTruckGeoJson(truck?: { longitude: number; latitude: number } | null) {
  return {
    type: "FeatureCollection" as const,
    features: truck
      ? [
          {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [truck.longitude, truck.latitude],
            },
            properties: { kind: "truck" },
          },
        ]
      : [],
  };
}

export function TourneeTracking() {
  const { token } = useParams<{ token: string }>();
  const tracking = useQuery(
    api.sorties.getPublicTrackingByToken,
    token ? { token } : "skip",
  );
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

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

  useEffect(() => {
    if (!MAPBOX_PUBLIC_TOKEN || !mapContainerRef.current || mapRef.current || !tracking) return;

    mapboxgl.accessToken = MAPBOX_PUBLIC_TOKEN;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center: recipientCoordinates ?? depotCoordinates ?? [2.2, 48.85],
      zoom: 10,
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
        paint: { "line-color": "#f1104f", "line-width": 5, "line-opacity": 0.8 },
      });

      map.addSource("pins", {
        type: "geojson",
        data: buildPinsGeoJson({ depot: depotCoordinates, recipient: recipientCoordinates }),
      });
      map.addLayer({
        id: "pins-circles",
        type: "circle",
        source: "pins",
        paint: {
          "circle-radius": 8,
          "circle-color": [
            "match",
            ["get", "kind"],
            "depot",
            "#0f766e",
            "recipient",
            "#f97316",
            "#52525b",
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addSource("truck", {
        type: "geojson",
        data: buildTruckGeoJson(
          tracking.vehicleLocation
            ? {
                longitude: tracking.vehicleLocation.longitude,
                latitude: tracking.vehicleLocation.latitude,
              }
            : null,
        ),
      });
      map.addLayer({
        id: "truck-circle",
        type: "circle",
        source: "truck",
        paint: {
          "circle-radius": 12,
          "circle-color": "#2563eb",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });

      const bounds = new mapboxgl.LngLatBounds();
      [depotCoordinates, recipientCoordinates].forEach((c) => {
        if (c) bounds.extend(c);
      });
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 56, maxZoom: 12 });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [depotCoordinates, recipientCoordinates, tracking]);

  useEffect(() => {
    if (!mapRef.current || !tracking) return;
    const map = mapRef.current;

    (map.getSource("route") as mapboxgl.GeoJSONSource | undefined)?.setData(
      buildRouteGeoJson(
        tracking.tournee.routeCoordinates,
        depotCoordinates,
        recipientCoordinates,
      ),
    );
    (map.getSource("pins") as mapboxgl.GeoJSONSource | undefined)?.setData(
      buildPinsGeoJson({ depot: depotCoordinates, recipient: recipientCoordinates }),
    );
    (map.getSource("truck") as mapboxgl.GeoJSONSource | undefined)?.setData(
      buildTruckGeoJson(
        tracking.vehicleLocation
          ? {
              longitude: tracking.vehicleLocation.longitude,
              latitude: tracking.vehicleLocation.latitude,
            }
          : null,
      ),
    );
  }, [depotCoordinates, recipientCoordinates, tracking]);

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
