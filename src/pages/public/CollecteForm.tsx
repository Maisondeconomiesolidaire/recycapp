import { useRef, useState } from "react";
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
import { useUpload } from "../../lib/useUpload";
import { cn } from "../../lib/cn";
import { Check, ImagePlus, Loader2, X } from "lucide-react";
import { COLLECTE_CATEGORIES, HOUSING_TYPES } from "../../lib/constants";

type CategoryPhoto = { storageId: Id<"_storage">; previewUrl: string };

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
    objectCategories: z.array(z.string()).optional(),
    grosObjetsAutre: z.string().optional(),
    dismountable: ouiNon,
    reusableGoodCondition: ouiNon,
    sorted: ouiNon,
    noWaste: ouiNon,
    comment: z.string().optional(),
  })
  .refine(
    (d) => (d.objectCategories?.length ?? 0) > 0 || Boolean(d.grosObjetsAutre?.trim()),
    {
      message: "Sélectionnez au moins une catégorie d'objet à collecter",
      path: ["objectCategories"],
    },
  );
type FormData = z.infer<typeof schema>;

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
    defaultValues: { objectCategories: [] },
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
        objectCategories: data.objectCategories,
        categoryPhotos: (data.objectCategories ?? [])
          .map((key) => ({
            category: key,
            photos: (categoryPhotos[key] ?? []).map((p) => p.storageId),
          }))
          .filter((entry) => entry.photos.length > 0),
        grosObjetsAutre: data.grosObjetsAutre?.trim() || undefined,
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

  const upload = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeCategoryRef = useRef<string | null>(null);
  const [categoryPhotos, setCategoryPhotos] = useState<Record<string, CategoryPhoto[]>>({});
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);

  function syncSelected(next: Record<string, CategoryPhoto[]>) {
    const keys = COLLECTE_CATEGORIES.map((c) => c.key).filter((k) => (next[k]?.length ?? 0) > 0);
    setValue("objectCategories", keys, { shouldValidate: true });
  }

  // Tape une catégorie → ouvre immédiatement le sélecteur de photos.
  function openPicker(categoryKey: string) {
    activeCategoryRef.current = categoryKey;
    fileInputRef.current?.click();
  }

  async function handleCategoryFiles(files: FileList | null) {
    const categoryKey = activeCategoryRef.current;
    if (!files || files.length === 0 || !categoryKey) return;
    setUploadingCategory(categoryKey);
    try {
      const added: CategoryPhoto[] = [];
      for (const file of Array.from(files)) {
        const storageId = await upload(file);
        added.push({ storageId, previewUrl: URL.createObjectURL(file) });
      }
      setCategoryPhotos((prev) => {
        const next = { ...prev, [categoryKey]: [...(prev[categoryKey] ?? []), ...added] };
        syncSelected(next);
        return next;
      });
    } finally {
      setUploadingCategory(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeCategoryPhoto(categoryKey: string, storageId: Id<"_storage">) {
    setCategoryPhotos((prev) => {
      const remaining = (prev[categoryKey] ?? []).filter((p) => p.storageId !== storageId);
      const next = { ...prev };
      if (remaining.length > 0) next[categoryKey] = remaining;
      else delete next[categoryKey];
      syncSelected(next);
      return next;
    });
  }

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
          <p className="-mt-1 mb-1 text-sm text-zinc-500">
            Touchez une catégorie pour ajouter des photos des objets concernés. Une catégorie
            est prise en compte dès qu'elle contient au moins une photo.
          </p>

          {/* Sélecteur de fichiers partagé (caméra / galerie). */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleCategoryFiles(e.target.files)}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {COLLECTE_CATEGORIES.map((cat) => {
              const photos = categoryPhotos[cat.key] ?? [];
              const checked = photos.length > 0;
              const uploading = uploadingCategory === cat.key;
              return (
                <div
                  key={cat.key}
                  className={cn(
                    "relative flex flex-col rounded-2xl border-2 p-3 transition",
                    checked
                      ? "border-brand-500 bg-brand-50 shadow-sm"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => openPicker(cat.key)}
                    aria-pressed={checked}
                    className="flex flex-col items-center gap-2 text-center"
                  >
                    {checked && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                    <img src={cat.image} alt="" className="h-16 w-16 object-contain" loading="lazy" />
                    <span
                      className={cn(
                        "text-xs font-semibold leading-tight",
                        checked ? "text-brand-700" : "text-zinc-700",
                      )}
                    >
                      {cat.label}
                    </span>
                  </button>

                  {/* Vignettes des photos uploadées pour la catégorie. */}
                  {(photos.length > 0 || uploading) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {photos.map((p) => (
                        <div key={p.storageId} className="relative h-12 w-12 overflow-hidden rounded-lg">
                          <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeCategoryPhoto(cat.key, p.storageId)}
                            className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
                            aria-label="Retirer la photo"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => openPicker(cat.key)}
                        className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-zinc-400 transition hover:border-brand-400 hover:text-brand-500"
                        aria-label="Ajouter une photo"
                      >
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ImagePlus className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Field label="Autre catégorie (précisez)">
            <Input
              {...register("grosObjetsAutre")}
              placeholder="Ex : instruments de musique, matériel médical…"
            />
          </Field>

          {errors.objectCategories?.message && (
            <p className="text-sm text-red-500">
              {errors.objectCategories.message as string}
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
