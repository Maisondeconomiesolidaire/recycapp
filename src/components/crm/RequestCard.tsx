import {
  Wind,
  Truck,
  ShoppingBag,
  Bike,
  CalendarClock,
  User,
} from "lucide-react";
import { Doc } from "../../../convex/_generated/dataModel";
import { formatDate, formatRelative, initials } from "../../lib/format";
import {
  TYPE_COLORS,
  RequestType,
  getDisplayedProcessStep,
  requestTypeDisplayLabel,
} from "../../lib/constants";
import { RequestOriginBadge } from "./RequestOriginBadge";

const ICONS = {
  aerogommage: Wind,
  collecte: Truck,
  article: ShoppingBag,
  velo: Bike,
} as const;

export function RequestCard({
  request,
  onOpen,
  assigneeName,
}: {
  request: Doc<"requests">;
  onOpen: () => void;
  assigneeName?: string;
}) {
  const Icon = ICONS[request.type as RequestType];
  const total = request.processSteps.length;
  const collecteUndefined =
    request.type === "collecte" &&
    (request.collecteType ?? "indefini") === "indefini";
  const displayedStep = getDisplayedProcessStep({
    completedSteps: request.completedSteps,
    processSteps: request.processSteps,
  });
  const completionPercent =
    total > 0 ? Math.round((request.completedSteps / total) * 100) : 0;

  return (
    <button
      onClick={onOpen}
      style={{ backgroundColor: TYPE_COLORS[request.type] }}
      className="block w-full text-left rounded-xl p-3 text-white shadow-sm ring-1 ring-black/10 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
            <Icon className="h-3.5 w-3.5" />
            {requestTypeDisplayLabel({
              type: request.type,
              collecteType: request.collecteType,
            })}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <RequestOriginBadge origin={request.requestOrigin} />
          <span className="rounded bg-white/18 px-1.5 py-0.5 text-[10px] font-medium text-white/90">
            {formatDate(request.createdAt)}
          </span>
          {!request.complete && (
            <span className="rounded bg-amber-300 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
              Incomplète
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">
          {initials(request.customer.firstName, request.customer.lastName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {request.customer.firstName} {request.customer.lastName}
          </p>
          <p className="truncate text-xs text-white/80">{summary(request)}</p>
        </div>
      </div>

      {/* Process */}
      <div className="mt-3">
        {collecteUndefined ? (
          <span className="inline-flex rounded-md bg-white/20 px-2 py-1 text-[11px] font-medium text-white">
            Collecte à définir
          </span>
        ) : total > 0 ? (
          <>
            <div className="flex items-center justify-between text-[11px] text-white/90">
              <span className="truncate">{displayedStep ?? "Process terminé"}</span>
              <span className="ml-2 shrink-0 tabular-nums">
                {completionPercent}%
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${(request.completedSteps / total) * 100}%` }}
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center gap-3 text-[11px] text-white/80">
        <span>{formatRelative(request.createdAt)}</span>
        {assigneeName && (
          <span className="inline-flex items-center gap-1 rounded bg-white/20 px-1.5 py-0.5 font-medium text-white">
            <User className="h-3 w-3" />
            {assigneeName}
          </span>
        )}
        {request.scheduledDate && (
          <span className="ml-auto inline-flex items-center gap-1 rounded bg-white/20 px-1.5 py-0.5 font-medium text-white">
            <CalendarClock className="h-3 w-3" />
            Planifié {formatDate(request.scheduledDate)}
          </span>
        )}
      </div>
    </button>
  );
}

function summary(r: Doc<"requests">): string {
  switch (r.type) {
    case "aerogommage": {
      const items = r.aerogommage ?? [];
      if (items.length === 0) return "Aérogommage";
      if (items.length > 1) return `${items.length} objets`;
      const objectType = items[0].objectType?.trim();
      if (objectType === "Autre (veuillez préciser)") return "Autre";
      return objectType || items[0].label?.trim() || "1 objet";
    }
    case "collecte": {
      const ca = r.collecte?.collectAddress;
      return (
        [ca?.postalCode, ca?.city].filter(Boolean).join(" ") ||
        "Collecte à domicile"
      );
    }
    case "article":
      if (r.articles && r.articles.length > 1) {
        return `${r.articles.length} articles réservés`;
      }
      return r.article?.articleTitle ?? "Réservation article";
    case "velo":
      return (
        [r.velo?.bikeType, r.velo?.service].filter(Boolean).join(" · ") ||
        "Atelier vélo"
      );
    default:
      return "";
  }
}
