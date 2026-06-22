import { useState } from "react";
import { Field, Input } from "../ui/Field";
import { FormSection } from "./FormShell";
import { PhoneInput } from "../ui/PhoneInput";
import { AddressAutocomplete } from "../ui/AddressAutocomplete";
import { useProfileAutofill } from "./useProfileAutofill";
import { CustomerSummary } from "./CustomerSummary";

/* Champs de coordonnées client, partagés par tous les formulaires.
   Typage volontairement souple : chaque formulaire a son propre schéma, on
   accepte donc un `register`/`errors` génériques (any) pour rester réutilisable. */
export function CustomerFields({
  register,
  errors,
  withAddress,
  watch,
  setValue,
  autofillProfile,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
  withAddress?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue?: any;
  /** Préremplit et masque les coordonnées d'un client connecté (réservation). */
  autofillProfile?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const { isSignedIn, customer, isComplete } = useProfileAutofill({
    watch,
    setValue,
    enabled: Boolean(autofillProfile),
    withAddress,
  });

  const addressValue =
    withAddress && watch ? String(watch("customer.address") ?? "") : "";

  // Client connecté avec des coordonnées complètes : on n'affiche qu'un résumé.
  if (autofillProfile && isSignedIn && isComplete && !editing) {
    return (
      <CustomerSummary
        customer={customer}
        withAddress={withAddress}
        onEdit={() => setEditing(true)}
      />
    );
  }

  return (
    <FormSection title="Vos coordonnées">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label="Prénom"
          required
          error={errors.customer?.firstName?.message as string}
        >
          <Input {...register("customer.firstName")} placeholder="Marie" />
        </Field>
        <Field
          label="Nom"
          required
          error={errors.customer?.lastName?.message as string}
        >
          <Input {...register("customer.lastName")} placeholder="Dupont" />
        </Field>
        <Field
          label="Email"
          required
          error={errors.customer?.email?.message as string}
        >
          <Input
            type="email"
            {...register("customer.email")}
            placeholder="marie.dupont@email.fr"
          />
        </Field>
        <Field
          label="Téléphone"
          required
          error={errors.customer?.phone?.message as string}
        >
          <PhoneInput {...register("customer.phone")} placeholder="06 12 34 56 78" />
        </Field>
      </div>

      {withAddress && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Adresse"
            required
            error={errors.customer?.address?.message as string}
            htmlFor="address"
          >
            {watch && setValue ? (
              <AddressAutocomplete
                id="address"
                value={addressValue}
                onValueChange={(value) =>
                  setValue("customer.address", value, { shouldValidate: true })
                }
                onSelect={(address) => {
                  setValue("customer.address", address.address, {
                    shouldValidate: true,
                  });
                  setValue("customer.postalCode", address.postalCode, {
                    shouldValidate: true,
                  });
                  setValue("customer.city", address.city, {
                    shouldValidate: true,
                  });
                }}
                placeholder="Commencez à saisir l’adresse…"
              />
            ) : (
              <Input
                id="address"
                {...register("customer.address")}
                placeholder="12 rue des Lilas"
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Code postal"
              required
              error={errors.customer?.postalCode?.message as string}
            >
              <Input {...register("customer.postalCode")} placeholder="75011" />
            </Field>
            <Field
              label="Ville"
              required
              error={errors.customer?.city?.message as string}
            >
              <Input {...register("customer.city")} placeholder="Paris" />
            </Field>
          </div>
        </div>
      )}
    </FormSection>
  );
}
