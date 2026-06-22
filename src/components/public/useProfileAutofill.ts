import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export type CustomerValues = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
};

/**
 * Pré-remplit les coordonnées d'un formulaire (react-hook-form) à partir du
 * profil du client connecté + son email Clerk. Ne remplace jamais une valeur
 * déjà saisie : seuls les champs vides sont complétés.
 *
 * Retourne de quoi décider d'afficher un résumé plutôt que tous les champs.
 */
export function useProfileAutofill({
  watch,
  setValue,
  enabled = true,
  withAddress = false,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue?: any;
  enabled?: boolean;
  withAddress?: boolean;
}) {
  const { isSignedIn, user } = useUser();
  const profile = useQuery(api.users.getMyProfile, isSignedIn ? {} : "skip");
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  useEffect(() => {
    if (!enabled || !isSignedIn || !setValue || !watch) return;
    const fill = (name: string, value?: string) => {
      if (value && !String(watch(name) ?? "").trim()) {
        setValue(name, value, { shouldValidate: true });
      }
    };
    fill("customer.email", email);
    if (profile) {
      fill("customer.firstName", profile.firstName ?? undefined);
      fill("customer.lastName", profile.lastName ?? undefined);
      fill("customer.phone", profile.phone ?? undefined);
      fill("customer.address", profile.address ?? undefined);
      fill("customer.postalCode", profile.postalCode ?? undefined);
      fill("customer.city", profile.city ?? undefined);
    }
  }, [enabled, isSignedIn, email, profile, setValue, watch]);

  const customer: CustomerValues = (watch ? watch("customer") : undefined) ?? {};
  const baseComplete = Boolean(
    customer.firstName?.trim() &&
      customer.lastName?.trim() &&
      customer.email?.trim() &&
      customer.phone?.trim(),
  );
  const addressComplete = Boolean(
    customer.address?.trim() && customer.postalCode?.trim() && customer.city?.trim(),
  );

  return {
    isSignedIn: Boolean(isSignedIn),
    profileLoaded: !isSignedIn || profile !== undefined,
    customer,
    isComplete: baseComplete && (!withAddress || addressComplete),
  };
}
