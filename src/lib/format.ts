import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export function formatDate(ts: number): string {
  return format(new Date(ts), "d MMM yyyy", { locale: fr });
}

export function formatDateTime(ts: number): string {
  return format(new Date(ts), "d MMM yyyy 'à' HH:mm", { locale: fr });
}

export function formatRelative(ts: number): string {
  return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: fr });
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
