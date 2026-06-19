import { Wind, Truck, ShoppingBag, Bike } from "lucide-react";
import { cn } from "../../lib/cn";
import {
  RequestType,
  TYPE_COLORS,
  typeBadgeStyle,
  typeSolidStyle,
  requestTypeDisplayLabel,
  type CollecteType,
} from "../../lib/constants";

const ICONS = {
  aerogommage: Wind,
  collecte: Truck,
  article: ShoppingBag,
  velo: Bike,
} as const;

export function TypeBadge({
  type,
  collecteType,
  size = "md",
  solid = false,
  inverse = false,
  prominent = false,
}: {
  type: RequestType;
  collecteType?: CollecteType;
  size?: "sm" | "md";
  solid?: boolean;
  inverse?: boolean;
  prominent?: boolean;
}) {
  const Icon = ICONS[type];
  return (
    <span
      className={cn(
        size === "sm"
          ? "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
          : "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        prominent &&
          "gap-2 px-4 py-2 text-[18px] leading-none font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.12)]",
      )}
      style={
        inverse
          ? {
              backgroundColor: "#fff",
              color: TYPE_COLORS[type],
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)",
            }
          : solid
            ? typeSolidStyle(type)
            : typeBadgeStyle(type)
      }
    >
      <Icon
        className={cn(
          size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
          prominent && "h-4 w-4",
        )}
      />
      {requestTypeDisplayLabel({ type, collecteType })}
    </span>
  );
}

/** Petit point coloré (pour les pastilles de calendrier, etc.). */
export function TypeDot({ type }: { type: RequestType }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
      style={{ backgroundColor: TYPE_COLORS[type] }}
    />
  );
}
