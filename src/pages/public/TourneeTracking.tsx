import { useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, Radio, Truck } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

const MAPBOX_PUBLIC_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

function formatTrackingAge(updatedAt?: number | null) {
  if (!updatedAt) return "Le camion n'a pas encore partagé sa position.";
  const diffSeconds = Math.max(0, Math.round((Date.now() - updatedAt) / 1000));
  if (diffSeconds < 60) return "Position mise à jour à l’instant";
  const minutes = Math.round(diffSeconds / 60);
  if (minutes < 60) return `Position mise à jour il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `Position mise à jour il y a ${hours} h`;
}

function buildRouteGeoJson(
  routeCoordinates: number[][],
  depot?: [number, number] | null,
  recipient?: [number, number] | null,
) {
  const coordinates =
    routeCoordinates.length > 0
      ? routeCoordinates
      : [depot, recipient].filter(Boolean) as number[][];

  return {
    type: "FeatureCollection" as const,
    features:
      coordinates.length > 1
        ? [
            {
              type: "Feature" as const,
              geometry: {
                type: "LineString" as const,
                coordinates,
              },
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
            properties: { kind: "truck", label: "Camion" },
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
        ? [tracking.tournee.depotLongitude, tracking.tournee.depotLatitude] as [number, number]
        : null,
    [tracking],
  );
  const recipientCoordinates = useMemo(
    () =>
      tracking?.recipient.longitude != null && tracking?.recipient.latitude != null
        ? [tracking.recipient.longitude, tracking.recipient.latitude] as [number, number]
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
        paint: {
          "line-color": "#f1104f",
          "line-width": 5,
          "line-opacity": 0.8,
        },
      });

      map.addSource("pins", {
        type: "geojson",
        data: buildPinsGeoJson({
          depot: depotCoordinates,
          recipient: recipientCoordinates,
        }),
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
          "circle-radius": 10,
          "circle-color": "#2563eb",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });

      const bounds = new mapboxgl.LngLatBounds();
      [depotCoordinates, recipientCoordinates].forEach((coordinate) => {
        if (coordinate) bounds.extend(coordinate);
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

    const routeSource = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
    routeSource?.setData(
      buildRouteGeoJson(
        tracking.tournee.routeCoordinates,
        depotCoordinates,
        recipientCoordinates,
      ),
    );

    const pinsSource = map.getSource("pins") as mapboxgl.GeoJSONSource | undefined;
    pinsSource?.setData(
      buildPinsGeoJson({
        depot: depotCoordinates,
        recipient: recipientCoordinates,
      }),
    );

    const truckSource = map.getSource("truck") as mapboxgl.GeoJSONSource | undefined;
    truckSource?.setData(
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

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-7 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_20px_60px_rgba(24,24,27,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
            Suivi de collecte
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
            {tracking.recipient.contactName || "Votre passage"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">{tracking.recipient.address}</p>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Tournée
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-950">{tracking.tournee.label}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {new Date(tracking.tournee.date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="flex items-center gap-2 text-zinc-950">
                <Truck className="h-4 w-4" />
                <p className="text-sm font-semibold">Position du camion</p>
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                {formatTrackingAge(tracking.vehicleLocation?.updatedAt ?? null)}
              </p>
              {tracking.vehicleLocation ? (
                <p className="mt-2 text-xs text-zinc-500">
                  Longitude {tracking.vehicleLocation.longitude.toFixed(5)} · Latitude{" "}
                  {tracking.vehicleLocation.latitude.toFixed(5)}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="flex items-center gap-2 text-zinc-950">
                <Radio className="h-4 w-4" />
                <p className="text-sm font-semibold">Adresse de départ</p>
              </div>
              <p className="mt-2 text-sm text-zinc-600">{tracking.tournee.depotAddress}</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(24,24,27,0.08)]">
          <div ref={mapContainerRef} className="h-[520px] w-full" />
        </section>
      </div>
    </div>
  );
}
