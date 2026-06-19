import { Badge } from "../ui/Badge";
import {
  REQUEST_ORIGIN_LABELS,
  type RequestOrigin,
} from "../../lib/constants";

export function RequestOriginBadge({
  origin,
  inverse = false,
}: {
  origin?: RequestOrigin;
  inverse?: boolean;
}) {
  const resolvedOrigin = origin ?? "external";
  return (
    <Badge
      className={
        inverse
          ? "bg-white/20 text-white"
          : resolvedOrigin === "internal"
            ? "bg-amber-500 text-white"
            : "bg-emerald-500 text-white"
      }
    >
      {REQUEST_ORIGIN_LABELS[resolvedOrigin]}
    </Badge>
  );
}
