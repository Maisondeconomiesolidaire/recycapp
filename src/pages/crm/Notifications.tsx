import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Bell,
  CalendarClock,
  ChevronRight,
  CreditCard,
  FileText,
  ShoppingBag,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { TypeBadge } from "../../components/crm/TypeBadge";
import { RequestDrawer } from "../../components/crm/RequestDrawer";
import { RequestOriginBadge } from "../../components/crm/RequestOriginBadge";
import { formatDateTime, formatRelative } from "../../lib/format";
import { cn } from "../../lib/cn";

type NotificationDoc = NonNullable<
  ReturnType<typeof useQuery<typeof api.notifications.list>>
>[number];

export function Notifications() {
  const notifications = useQuery(api.notifications.list);
  const unreadCount = useQuery(api.notifications.unreadCount);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const [openRequestId, setOpenRequestId] = useState<Id<"requests"> | null>(null);

  useEffect(() => {
    if (unreadCount === undefined || unreadCount === 0) return;
    void markAllRead();
  }, [unreadCount, markAllRead]);

  const stats = useMemo(() => {
    if (!notifications) return null;
    return {
      total: notifications.length,
      boutique: notifications.filter((item) => item.requestType === "article").length,
      paid: notifications.filter((item) => item.paymentCaptured).length,
    };
  }, [notifications]);

  return (
    <div>
      <PageHeader title="Notifications" />

      <div className="p-4 sm:p-6">
        {notifications === undefined ? (
          <FullSpinner label="Chargement…" />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-10 w-10" />}
            title="Aucune notification"
            description="Les nouvelles demandes apparaîtront ici."
          />
        ) : (
          <div className="space-y-4">
            {stats && (
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Notifications" value={String(stats.total)} />
                <StatCard label="Demandes boutique" value={String(stats.boutique)} />
                <StatCard label="Paiements carte" value={String(stats.paid)} />
              </div>
            )}

            <div className="space-y-3">
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification._id}
                  notification={notification}
                  onOpenRequest={setOpenRequestId}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <RequestDrawer
        requestId={openRequestId}
        onClose={() => setOpenRequestId(null)}
      />
    </div>
  );
}

function NotificationCard({
  notification,
  onOpenRequest,
}: {
  notification: NotificationDoc;
  onOpenRequest: (id: Id<"requests">) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenRequest(notification.requestId)}
      className="group flex w-full items-start justify-between gap-4 rounded-[24px] border border-[var(--crm-border)] bg-[color:color-mix(in_srgb,var(--crm-surface)_92%,transparent)] p-4 text-left shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition hover:border-[var(--crm-border-strong)] hover:bg-[var(--crm-surface-2)]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-500 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
            Nouvelle demande
          </span>
          <TypeBadge type={notification.requestType} size="sm" solid />
          <RequestOriginBadge origin={notification.requestOrigin} />
          {notification.requestReference && (
            <InfoChip label={`#${notification.requestReference}`} />
          )}
          <span className="ml-auto text-xs text-zinc-500">
            {formatRelative(notification.createdAt)}
          </span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--crm-surface-2)] text-sm font-bold text-zinc-100">
                {initialsFromName(notification.customerName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-zinc-100">
                  {notification.customerName}
                </p>
                <p className="text-xs text-zinc-500">
                  {formatDateTime(notification.createdAt)}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm font-medium leading-6 text-zinc-200">
              {notification.requestPreview}
            </p>
            {notification.requestSecondaryPreview && (
              <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-zinc-500">
                {notification.requestSecondaryPreview}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {notification.currentStep && (
                <InfoChip icon={<FileText className="h-3 w-3" />} label={notification.currentStep} />
              )}
              {notification.articleCount && notification.articleCount > 1 && (
                <InfoChip
                  icon={<ShoppingBag className="h-3 w-3" />}
                  label={`${notification.articleCount} articles`}
                />
              )}
              {notification.scheduledDate && (
                <InfoChip
                  icon={<CalendarClock className="h-3 w-3" />}
                  label={`Planifiée le ${formatDateTime(notification.scheduledDate)}`}
                  tone="success"
                />
              )}
              {notification.paymentMethod === "cb" && (
                <InfoChip
                  icon={<CreditCard className="h-3 w-3" />}
                  label={
                    notification.paymentCaptured
                      ? "Carte prélevée"
                      : notification.paymentValidated
                        ? "Carte validée"
                        : "Carte en attente"
                  }
                  tone="success"
                />
              )}
              {notification.paymentMethod === "especes" && (
                <InfoChip label="Paiement en espèces en boutique" tone="amber" />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Aperçu rapide
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <PreviewRow label="Objet" value={notification.requestPreview} />
              <PreviewRow label="Statut" value={notification.title} />
              <PreviewRow
                label="Paiement"
                value={
                  notification.paymentMethod === "cb"
                    ? notification.paymentCaptured
                      ? "Carte bancaire prélevée"
                      : notification.paymentValidated
                        ? "Carte bancaire validée"
                        : "Carte bancaire en attente"
                    : notification.paymentMethod === "especes"
                      ? "Espèces prévues en boutique"
                      : undefined
                }
              />
            </div>
          </div>
        </div>
      </div>

      <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-zinc-300" />
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--crm-border)] bg-[color:color-mix(in_srgb,var(--crm-surface)_92%,transparent)] px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--crm-border)] py-1.5 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="max-w-[65%] text-right text-zinc-200">{value}</span>
    </div>
  );
}

function InfoChip({
  label,
  icon,
  tone = "neutral",
}: {
  label: string;
  icon?: ReactNode;
  tone?: "neutral" | "success" | "amber";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        tone === "neutral" && "bg-[var(--crm-surface-2)] text-zinc-300",
        tone === "success" && "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/18",
        tone === "amber" && "bg-amber-500/12 text-amber-300 ring-1 ring-amber-500/18",
      )}
    >
      {icon}
      {label}
    </span>
  );
}

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
