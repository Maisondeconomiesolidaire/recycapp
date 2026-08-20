import { ConvexError } from "convex/values";

/**
 * Message lisible d'une erreur remontée par Convex.
 *
 * En production, le texte d'un `Error` lancé côté serveur est masqué et
 * remplacé par « Server Error » : seules les `ConvexError` transportent leur
 * message jusqu'au navigateur. On lit donc `data` en priorité, et on écarte le
 * message générique quand il n'apporte rien.
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ConvexError) {
    const data = error.data as unknown;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object" && "message" in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  if (error instanceof Error && error.message && !/server error/i.test(error.message)) {
    return error.message;
  }
  return fallback;
}
