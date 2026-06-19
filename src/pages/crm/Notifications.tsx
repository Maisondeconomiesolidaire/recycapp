import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bell, ChevronRight } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { TypeBadge } from "../../components/crm/TypeBadge";
import { RequestDrawer } from "../../components/crm/RequestDrawer";
import { formatDateTime } from "../../lib/format";

type NotificationDoc = Doc<"notifications">;

export function Notifications() {
  const notifications = useQuery(api.notifications.list);
  const unreadCount = useQuery(api.notifications.unreadCount);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const [openRequestId, setOpenRequestId] = useState<Id<"requests"> | null>(null);

  useEffect(() => {
    if (unreadCount === undefined || unreadCount === 0) return;
    void markAllRead();
  }, [unreadCount, markAllRead]);

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
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification._id}
                notification={notification}
                onOpenRequest={setOpenRequestId}
              />
            ))}
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
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left transition hover:bg-zinc-800/70"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-semibold text-white">
            Nouvelle demande
          </span>
          <TypeBadge type={notification.requestType} size="sm" solid />
        </div>

        <p className="mt-3 text-sm font-medium text-zinc-100">
          {notification.customerName}
        </p>
        <p className="mt-1 text-sm text-zinc-500">{notification.title}</p>
        <p className="mt-2 text-xs text-zinc-600">
          {formatDateTime(notification.createdAt)}
        </p>
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600" />
    </button>
  );
}
