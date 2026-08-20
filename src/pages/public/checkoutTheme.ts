import type { Appearance } from "@stripe/stripe-js";

/** Rose de la boutique, partagé par les deux écrans de paiement. */
export const BRAND = "#f1104f";

/** Délai laissé au client pour venir chercher son article (aligné sur l'email). */
export const PICKUP_DEADLINE_DAYS = 5;

/** Habillage du Payment Element aux couleurs de la boutique. */
export const checkoutAppearance: Appearance = {
  theme: "flat",
  variables: {
    colorPrimary: BRAND,
    colorBackground: "#ffffff",
    colorText: "#18181b",
    colorTextSecondary: "#71717a",
    colorDanger: "#dc2626",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    fontSizeBase: "15px",
    borderRadius: "16px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1px solid #e4e4e7",
      boxShadow: "none",
      padding: "12px 14px",
    },
    ".Input:focus": {
      border: `1px solid ${BRAND}`,
      boxShadow: "0 0 0 4px rgba(241,16,79,0.12)",
    },
    ".Label": { fontWeight: "600", color: "#3f3f46" },
    ".Tab": { border: "1px solid #e4e4e7", boxShadow: "none" },
    ".Tab--selected": {
      border: `1px solid ${BRAND}`,
      boxShadow: "0 0 0 4px rgba(241,16,79,0.12)",
    },
  },
};
