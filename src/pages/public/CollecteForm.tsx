import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, UseFormRegister, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { FormShell, FormSection } from "../../components/public/FormShell";
import { Field, Input, Textarea, Checkbox, Select } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { PhotoUpload } from "../../components/ui/PhotoUpload";
import { AddressAutocomplete } from "../../components/ui/AddressAutocomplete";
import { useProfileAutofill } from "../../components/public/useProfileAutofill";
import { cn } from "../../lib/cn";
import { COLLECTE_ITEM_OPTIONS, HOUSING_TYPES } from "../../lib/constants";

const optNum = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
  z.number().nonnegative().optional(),
);
const ouiNon = z.enum(["oui", "non"], { required_error: "Répondez à la question" });

const schema = z
  .object({
    customer: z.object({
      firstName: z.string().min(1, "Prénom requis"),
      lastName: z.string().min(1, "Nom requis"),
      email: z.string().email("Email invalide"),
      phone: z.string().min(6, "Téléphone requis"),
      address: z.string().min(1, "Adresse requise"),
      postalCode: z.string().min(1, "Code postal requis"),
      city: z.string().min(1, "Ville requise"),
    }),
    collectAddress: z.object({
      address: z.string().min(1, "Adresse requise"),
      postalCode: z.string().min(1, "Code postal requis"),
      city: z.string().min(1, "Ville requise"),
    }),
    housingType: z.string().min(1, "Sélectionnez le type de logement"),
    floors: optNum,
    dedicatedParking: z.boolean().optional(),
    parkingUnknown: z.boolean().optional(),
    parkingDistance: optNum,
    grosObjets: z.array(z.string()).optional(),
    grosObjetsAutre: z.string().optional(),
    petitsObjets: z.array(z.string()).optional(),
    petitsObjetsAutre: z.string().optional(),
    dismountable: ouiNon,
    reusableGoodCondition: ouiNon,
    sorted: ouiNon,
    noWaste: ouiNon,
    comment: z.string().optional(),
  })
  .refine(
    (d) =>
      (d.grosObjets?.length ?? 0) > 0 ||
      (d.petitsObjets?.length ?? 0) > 0 ||
      d.grosObjetsAutre?.trim() ||
      d.petitsObjetsAutre?.trim(),
    {
      message: "Sélectionnez au moins un type d'objet à collecter",
      path: ["grosObjets"],
    },
  );
type FormData = z.infer<typeof schema>;

const AUTRE = "Autres (précisez)";

export function CollecteForm() {
  const navigate = useNavigate();
  const submit = useMutation(api.requests.submitCollecte);
  const [photos, setPhotos] = useState<Id<"_storage">[]>([]);
  const [sameAddress, setSameAddress] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { grosObjets: [], petitsObjets: [] },
  });

  // Préremplit les coordonnées (dont l'adresse de facturation) depuis le profil
  // du client connecté — sans écraser une saisie en cours.
  useProfileAutofill({ watch, setValue, enabled: true, withAddress: true });

  function copyBillingToCollect() {
    const next = !sameAddress;
    setSameAddress(next);
    if (next) {
      setValue("collectAddress.address", watch("customer.address") ?? "");
      setValue("collectAddress.postalCode", watch("customer.postalCode") ?? "");
      setValue("collectAddress.city", watch("customer.city") ?? "");
    }
  }

  async function onSubmit(data: FormData) {
    await submit({
      customer: data.customer,
      comment: data.comment || undefined,
      photos,
      details: {
        dismountable: data.dismountable === "oui",
        reusableGoodCondition: data.reusableGoodCondition === "oui",
        sorted: data.sorted === "oui",
        noWaste: data.noWaste === "oui",
        grosObjets: data.grosObjets,
        grosObjetsAutre: data.grosObjets?.includes(AUTRE)
          ? data.grosObjetsAutre
          : undefined,
        petitsObjets: data.petitsObjets,
        petitsObjetsAutre: data.petitsObjets?.includes(AUTRE)
          ? data.petitsObjetsAutre
          : undefined,
        housingType: data.housingType,
        floors: data.floors,
        dedicatedParking: data.dedicatedParking,
        parkingUnknown: data.parkingUnknown,
        parkingDistance: data.parkingUnknown ? undefined : data.parkingDistance,
        collectAddress: data.collectAddress,
      },
    });
    navigate("/merci?type=collecte");
  }

  const grosSel = watch("grosObjets") ?? [];
  const petitsSel = watch("petitsObjets") ?? [];

  return (
    <FormShell
      title="Demande de collecte à domicile"
      subtitle="Nous venons récupérer vos objets réemployables chez vous."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <FormSection title="Vos coordonnées">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Prénom" required error={errors.customer?.firstName?.message}>
              <Input {...register("customer.firstName")} placeholder="Marie" />
            </Field>
            <Field label="Nom" required error={errors.customer?.lastName?.message}>
              <Input {...register("customer.lastName")} placeholder="Dupont" />
            </Field>
            <Field label="Email" required error={errors.customer?.email?.message}>
              <Input type="email" {...register("customer.email")} />
            </Field>
            <Field label="Téléphone" required error={errors.customer?.phone?.message}>
              <Input type="tel" {...register("customer.phone")} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Adresse de facturation">
          <Field label="Adresse" required error={errors.customer?.address?.message}>
            <AddressAutocomplete
              value={watch("customer.address") ?? ""}
              onValueChange={(v) => setValue("customer.address", v, { shouldValidate: true })}
              onSelect={(a) => {
                setValue("customer.address", a.address, { shouldValidate: true });
                setValue("customer.postalCode", a.postalCode, { shouldValidate: true });
                setValue("customer.city", a.city, { shouldValidate: true });
              }}
              placeholder="12 rue des Lilas"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code postal" required error={errors.customer?.postalCode?.message}>
              <Input {...register("customer.postalCode")} placeholder="60000" />
            </Field>
            <Field label="Ville" required error={errors.customer?.city?.message}>
              <Input {...register("customer.city")} placeholder="Beauvais" />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Adresse de collecte">
          <Checkbox
            label="Identique à l'adresse de facturation"
            checked={sameAddress}
            onChange={copyBillingToCollect}
          />
          <Field label="Adresse" required error={errors.collectAddress?.address?.message}>
            <AddressAutocomplete
              value={watch("collectAddress.address") ?? ""}
              onValueChange={(v) =>
                setValue("collectAddress.address", v, { shouldValidate: true })
              }
              onSelect={(a) => {
                setValue("collectAddress.address", a.address, { shouldValidate: true });
                setValue("collectAddress.postalCode", a.postalCode, { shouldValidate: true });
                setValue("collectAddress.city", a.city, { shouldValidate: true });
              }}
              placeholder="Lieu où récupérer les objets"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code postal" required error={errors.collectAddress?.postalCode?.message}>
              <Input {...register("collectAddress.postalCode")} />
            </Field>
            <Field label="Ville" required error={errors.collectAddress?.city?.message}>
              <Input {...register("collectAddress.city")} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Votre logement">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Type de logement" required error={errors.housingType?.message}>
              <Select {...register("housingType")} defaultValue="">
                <option value="" disabled>
                  Sélectionner…
                </option>
                {HOUSING_TYPES.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nombre d'étages">
              <Input type="number" min="0" step="1" {...register("floors")} placeholder="0" />
            </Field>
          </div>
          <Checkbox
            label="Place de parking dédiée / privée"
            {...register("dedicatedParking")}
          />
          <Checkbox
            label="Je ne connais pas la distance du parking"
            {...register("parkingUnknown")}
          />
          {!watch("parkingUnknown") && (
            <div>
              <Field label="Distance de la place de parking (mètres)">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  {...register("parkingDistance")}
                  placeholder="Ex : 15"
                />
              </Field>
              {Number(watch("parkingDistance")) > 25 && (
                <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                  ⚠️ Des frais additionnels de 15 euros pourront vous être
                  facturés (parking à plus de 25 mètres).
                </p>
              )}
            </div>
          )}
        </FormSection>

        <FormSection title="Objets à collecter">
          <ItemMultiSelect
            title="Gros objets"
            name="grosObjets"
            selected={grosSel}
            register={register}
          />
          {grosSel.includes(AUTRE) && (
            <Field label="Autres gros objets (précisez)">
              <Input {...register("grosObjetsAutre")} />
            </Field>
          )}

          <ItemMultiSelect
            title="Petits objets"
            name="petitsObjets"
            selected={petitsSel}
            register={register}
          />
          {petitsSel.includes(AUTRE) && (
            <Field label="Autres petits objets (précisez)">
              <Input {...register("petitsObjetsAutre")} />
            </Field>
          )}
          {errors.grosObjets?.message && (
            <p className="text-sm text-red-500">
              {errors.grosObjets.message as string}
            </p>
          )}
        </FormSection>

        <FormSection title="Conditions du don">
          <YesNo
            label="Pourrez-vous, si nécessaire, assurer le démontage des meubles volumineux ?"
            name="dismountable"
            register={register}
            errors={errors}
          />
          <YesNo
            label="Tous les objets seront-ils en bon état / réemployables ?"
            name="reusableGoodCondition"
            register={register}
            errors={errors}
          />
          <YesNo
            label="Vos objets seront-ils triés par famille ?"
            name="sorted"
            register={register}
            errors={errors}
          />
          <YesNo
            label="Confirmez-vous que votre don ne contiendra aucun déchet / objets non collectables ?"
            name="noWaste"
            register={register}
            errors={errors}
          />
        </FormSection>

        <FormSection title="Photos & commentaire">
          <div>
            <p className="text-sm font-medium text-zinc-700 mb-1.5">Photos</p>
            <PhotoUpload value={photos} onChange={setPhotos} />
          </div>
          <Field label="Commentaire">
            <Textarea
              {...register("comment")}
              placeholder="Précisions sur l'accès, l'étage, etc."
            />
          </Field>
        </FormSection>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Envoi en cours…" : "Envoyer ma demande"}
        </Button>
      </form>
    </FormShell>
  );
}

/** Groupe de cases à cocher (multi-sélection) pour une famille d'objets. */
function ItemMultiSelect({
  title,
  name,
  selected,
  register,
}: {
  title: string;
  name: "grosObjets" | "petitsObjets";
  selected: string[];
  register: UseFormRegister<FormData>;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-zinc-700 mb-2">{title}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {COLLECTE_ITEM_OPTIONS.map((opt) => {
          const checked = selected.includes(opt);
          return (
            <label
              key={opt}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors",
                checked
                  ? "border-brand-500 bg-brand-50"
                  : "border-zinc-300 hover:bg-zinc-50",
              )}
            >
              <input
                type="checkbox"
                value={opt}
                {...register(name)}
                className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-zinc-800">{opt}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Question Oui / Non (boutons radio). */
function YesNo({
  label,
  name,
  register,
  errors,
}: {
  label: string;
  name: "dismountable" | "reusableGoodCondition" | "sorted" | "noWaste";
  register: UseFormRegister<FormData>;
  errors: FieldErrors<FormData>;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <p className="text-sm font-medium text-zinc-800">{label}</p>
      <div className="mt-3 flex gap-3">
        {(["oui", "non"] as const).map((val) => (
          <label
            key={val}
            className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer"
          >
            <input
              type="radio"
              value={val}
              {...register(name)}
              className="h-4 w-4 border-zinc-300 text-brand-600 focus:ring-brand-500"
            />
            {val === "oui" ? "Oui" : "Non"}
          </label>
        ))}
      </div>
      {errors[name] && (
        <p className="mt-1 text-sm text-red-500">
          {errors[name]?.message as string}
        </p>
      )}
    </div>
  );
}
