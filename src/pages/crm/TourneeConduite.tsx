import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Flag,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Play,
  Radio,
  Truck,
  User,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const TOURNEE_DEPOT_ADDRESS = "4 rue de la prairie 60650 Lachapelle-aux-Pots";

function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatKm(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

function buildDirectionsUrl(stop: { address: string; latitude?: number; longitude?: number }) {
  const destination =
    typeof stop.latitude === "number" && typeof stop.longitude === "number"
      ? `${stop.latitude},${stop.longitude}`
      : stop.address;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}

export function TourneeConduite() {
  return (
    <>
      <SignedIn>
        <DriverMode />
      </SignedIn>
      <SignedOut>
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
          <SignIn />
        </div>
      </SignedOut>
    </>
  );
}

function DriverMode() {
  const { tourneeId } = useParams<{ tourneeId: string }>();
  const navigate = useNavigate();
  const tournee = useQuery(
    api.sorties.getTournee,
    tourneeId ? { tourneeId: tourneeId as Id<"tournees"> } : "skip",
  );
  const updateStop = useMutation(api.sorties.updateTourneeStop);
  const updateStatus = useMutation(api.sorties.updateTourneeStatus);
  const updateVehicleLocation = useMutation(api.sorties.updateTourneeVehicleLocation);

  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const broadcastIntervalRef = useRef<number | null>(null);
  const latestPayloadRef = useRef<{
    latitude: number;
    longitude: number;
    heading?: number;
    accuracy?: number;
    speedKmh?: number;
  } | null>(null);

  const isActive = tournee?.status === "en_cours";

  function payloadFromPosition(pos: GeolocationPosition) {
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      heading:
        typeof pos.coords.heading === "number" && !Number.isNaN(pos.coords.heading)
          ? pos.coords.heading
          : undefined,
      accuracy:
        typeof pos.coords.accuracy === "number" && !Number.isNaN(pos.coords.accuracy)
          ? pos.coords.accuracy
          : undefined,
      speedKmh:
        typeof pos.coords.speed === "number" && !Number.isNaN(pos.coords.speed)
          ? Math.max(0, Math.round(pos.coords.speed * 3.6))
          : undefined,
    };
  }

  function publishVehicleLocation(payload: NonNullable<typeof latestPayloadRef.current>) {
    if (!tourneeId) return;
    setPosition({ latitude: payload.latitude, longitude: payload.longitude });
    void updateVehicleLocation({
      tourneeId: tourneeId as Id<"tournees">,
      latitude: payload.latitude,
      longitude: payload.longitude,
      heading: payload.heading,
      accuracy: payload.accuracy,
      speedKmh: payload.speedKmh,
    }).catch(() => {
      /* network hiccup — keep the tracking loop alive */
    });
  }

  // Live GPS capture while the tour is running.
  useEffect(() => {
    if (!isActive || !tourneeId || !("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null);
        latestPayloadRef.current = payloadFromPosition(pos);
        publishVehicleLocation(latestPayloadRef.current);
      },
      (error) => {
        setGpsError(
          error.code === error.PERMISSION_DENIED
            ? "Autorisez la localisation pour activer le suivi en direct."
            : "Position GPS indisponible pour le moment.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isActive, tourneeId, updateVehicleLocation]);

  // Guaranteed 20-second location broadcast for the public tracking map.
  useEffect(() => {
    if (!isActive || !tourneeId) return;

    const requestAndSendLatest = () => {
      if (!("geolocation" in navigator)) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsError(null);
          latestPayloadRef.current = payloadFromPosition(pos);
          publishVehicleLocation(latestPayloadRef.current);
        },
        () => {
          if (latestPayloadRef.current) {
            publishVehicleLocation(latestPayloadRef.current);
          }
        },
        { enableHighAccuracy: true, maximumAge: 15_000, timeout: 15_000 },
      );
    };

    requestAndSendLatest();
    broadcastIntervalRef.current = window.setInterval(requestAndSendLatest, 20_000);
    return () => {
      if (broadcastIntervalRef.current !== null) {
        window.clearInterval(broadcastIntervalRef.current);
        broadcastIntervalRef.current = null;
      }
      latestPayloadRef.current = null;
    };
  }, [isActive, tourneeId, updateVehicleLocation]);

  const sortedStops = useMemo(
    () => (tournee?.stops ?? []).slice().sort((a, b) => a.order - b.order),
    [tournee],
  );
  const pendingStops = sortedStops.filter((s) => s.status === "prevu");
  const doneCount = sortedStops.filter((s) => s.status === "effectue").length;
  const nextStop = pendingStops[0] ?? null;
  const upcomingStops = pendingStops.slice(1);

  const distanceToNext = useMemo(() => {
    if (
      !nextStop ||
      !position ||
      typeof nextStop.latitude !== "number" ||
      typeof nextStop.longitude !== "number"
    ) {
      return null;
    }
    return haversineKm(position, {
      latitude: nextStop.latitude,
      longitude: nextStop.longitude,
    });
  }, [nextStop, position]);

  if (tournee === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!tournee) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 p-6 text-center text-zinc-400">
        <Truck className="h-10 w-10 text-zinc-700" />
        <p>Tournée introuvable.</p>
        <Link to="/crm/tournees" className="text-brand-400 font-semibold">
          Retour aux tournées
        </Link>
      </div>
    );
  }

  async function markDone(order: number) {
    setSavingOrder(order);
    try {
      await updateStop({
        tourneeId: tournee!._id,
        stopOrder: order,
        status: "effectue",
      });
    } finally {
      setSavingOrder((current) => (current === order ? null : current));
    }
  }

  const allDone = pendingStops.length === 0 && sortedStops.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/crm/tournees")}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-zinc-100">{tournee.label}</p>
            <p className="text-xs text-zinc-500">
              {doneCount}/{sortedStops.length} arrêt{sortedStops.length > 1 ? "s" : ""} effectué
              {doneCount > 1 ? "s" : ""}
              {isActive && (
                <span className="ml-2 inline-flex items-center gap-1 text-emerald-400">
                  <Radio className="h-3 w-3" />
                  Suivi actif
                </span>
              )}
            </p>
          </div>
        </div>
        {sortedStops.length > 0 && (
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${(doneCount / sortedStops.length) * 100}%` }}
            />
          </div>
        )}
      </header>

      <main className="flex-1 space-y-4 px-4 py-4 pb-24">
        {gpsError && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            {gpsError}
          </div>
        )}

        {/* Départ dépôt */}
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <Flag className="h-4 w-4 shrink-0 text-teal-400" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Départ</p>
            <p className="truncate text-sm text-zinc-300">{TOURNEE_DEPOT_ADDRESS}</p>
          </div>
        </div>

        {/* Tour not started yet */}
        {tournee.status === "planifiee" && (
          <button
            type="button"
            onClick={() => updateStatus({ tourneeId: tournee._id, status: "en_cours" })}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 text-base font-bold text-white shadow-[0_4px_14px_rgba(241,16,79,0.3)] transition hover:opacity-90"
          >
            <Play className="h-5 w-5" />
            Démarrer la tournée
          </button>
        )}

        {/* All done */}
        {allDone && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <p className="mt-2 text-base font-bold text-emerald-300">Tous les arrêts sont effectués !</p>
            <p className="mt-1 text-sm text-emerald-200/70">
              Retour au dépôt : {TOURNEE_DEPOT_ADDRESS}
            </p>
            {tournee.status === "en_cours" && (
              <button
                type="button"
                onClick={async () => {
                  await updateStatus({ tourneeId: tournee._id, status: "terminee" });
                  navigate("/crm/tournees");
                }}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                <Flag className="h-4 w-4" />
                Terminer la tournée
              </button>
            )}
          </div>
        )}

        {/* Next stop — the head of the queue */}
        {nextStop && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">
              Prochain arrêt
            </p>
            <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-b from-brand-500/10 to-zinc-900 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                  {nextStop.order}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                    <p className="text-base font-semibold text-zinc-100">{nextStop.address}</p>
                  </div>
                  {nextStop.contactName && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-sm text-zinc-400">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span>{nextStop.contactName}</span>
                    </div>
                  )}
                  {nextStop.notes && (
                    <p className="mt-1.5 rounded-lg bg-zinc-800/60 px-3 py-2 text-sm italic text-zinc-300">
                      {nextStop.notes}
                    </p>
                  )}
                  {distanceToNext != null && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-300">
                      <Navigation className="h-3.5 w-3.5" />
                      À {formatKm(distanceToNext)} (à vol d'oiseau)
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={buildDirectionsUrl(nextStop)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
                >
                  <Navigation className="h-4 w-4" />
                  Itinéraire GPS
                </a>
                {nextStop.contactPhone ? (
                  <a
                    href={`tel:${nextStop.contactPhone}`}
                    className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
                  >
                    <Phone className="h-4 w-4" />
                    Appeler
                  </a>
                ) : (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 py-3 text-sm text-zinc-600">
                    <Phone className="h-4 w-4" />
                    Pas de tél.
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={savingOrder === nextStop.order || tournee.status !== "en_cours"}
                onClick={() => markDone(nextStop.order)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 text-base font-bold text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingOrder === nextStop.order ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}
                Marquer comme effectué
              </button>
              {tournee.status === "planifiee" && (
                <p className="mt-2 text-center text-xs text-zinc-500">
                  Démarrez la tournée pour valider les arrêts.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Upcoming stops */}
        {upcomingStops.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              À suivre ({upcomingStops.length})
            </p>
            <div className="space-y-2">
              {upcomingStops.map((stop) => (
                <div
                  key={stop.order}
                  className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400">
                    {stop.order}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-200">{stop.address}</p>
                    {stop.contactName && (
                      <p className="truncate text-xs text-zinc-500">{stop.contactName}</p>
                    )}
                  </div>
                  <a
                    href={buildDirectionsUrl(stop)}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                    aria-label="Itinéraire"
                  >
                    <Navigation className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed stops */}
        {doneCount > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Effectués ({doneCount})
            </p>
            <div className="space-y-2">
              {sortedStops
                .filter((s) => s.status === "effectue")
                .map((stop) => (
                  <div
                    key={stop.order}
                    className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-400 line-through">
                        {stop.address}
                      </p>
                    </div>
                    {tournee.status === "en_cours" && (
                      <button
                        type="button"
                        onClick={() =>
                          updateStop({
                            tourneeId: tournee._id,
                            stopOrder: stop.order,
                            status: "prevu",
                          })
                        }
                        className="shrink-0 text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {sortedStops.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">
            Cette tournée ne contient aucun arrêt.
          </p>
        )}
      </main>
    </div>
  );
}
