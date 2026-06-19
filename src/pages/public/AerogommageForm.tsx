import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  AERO_OBJECT_TYPES,
  WOOD_TYPES,
  STRIPPING_OPTIONS,
  COATING_OPTIONS,
} from "../../lib/constants";
import { FormShell } from "../../components/public/FormShell";
import { CustomerFields } from "../../components/public/CustomerFields";
import { Field, Input, Select, Textarea, Checkbox } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { PhotoUpload } from "../../components/ui/PhotoUpload";

const num = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
  z.number({ invalid_type_error: "Nombre requis" }).positive("Doit être positif"),
);
const optNum = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
  z.number().positive().optional(),
);

const itemSchema = z.object({
  objectType: z.string().min(1, "Sélectionnez le type d'objet"),
  label: z.string().optional(),
  height: num,
  width: num,
  depth: num,
  quantity: optNum,
  woodType: z.string().min(1, "Sélectionnez la nature du bois"),
  stripping: z.string().min(1, "Sélectionnez le type de décapage"),
  coating: z.string().min(1, "Sélectionnez le revêtement"),
  coatingOther: z.string().optional(),
  delivery: z.boolean().optional(),
  retrieval: z.boolean().optional(),
  comment: z.string().optional(),
  photos: z.array(z.string()).optional(),
});

const schema = z.object({
  customer: z.object({
    firstName: z.string().min(1, "Prénom requis"),
    lastName: z.string().min(1, "Nom requis"),
    email: z.string().email("Email invalide"),
    phone: z.string().min(6, "Téléphone requis"),
    address: z.string().min(1, "Adresse requise"),
    postalCode: z.string().min(1, "Code postal requis"),
    city: z.string().min(1, "Ville requise"),
  }),
  items: z.array(itemSchema).min(1, "Ajoutez au moins un objet"),
});
type FormData = z.infer<typeof schema>;

const emptyItem = {
  objectType: "",
  label: "",
  height: "",
  width: "",
  depth: "",
  quantity: "",
  woodType: "",
  stripping: "",
  coating: "",
  coatingOther: "",
  delivery: false,
  retrieval: false,
  comment: "",
  photos: [],
} as unknown as FormData["items"][number];

export function AerogommageForm() {
  const navigate = useNavigate();
  const submit = useMutation(api.requests.submitAerogommage);
  const [singleObjectConfirmOpen, setSingleObjectConfirmOpen] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<FormData | null>(null);

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { items: [emptyItem] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  async function submitRequest(data: FormData) {
    await submit({
      customer: data.customer,
      photos: [],
      items: data.items.map((it) => ({
        objectType: it.objectType,
        label: it.label || undefined,
        height: it.height,
        width: it.width,
        depth: it.depth,
        quantity: it.quantity,
        woodType: it.woodType,
        stripping: it.stripping,
        coating: it.coating,
        coatingOther: it.coatingOther || undefined,
        delivery: !!it.delivery,
        retrieval: !!it.retrieval,
        comment: it.comment || undefined,
        photos: (it.photos ?? []) as Id<"_storage">[],
      })),
    });
    navigate("/merci?type=aerogommage");
  }

  async function onSubmit(data: FormData) {
    if (data.items.length === 1) {
      setPendingSubmitData(data);
      setSingleObjectConfirmOpen(true);
      return;
    }
    await submitRequest(data);
  }

  return (
    <FormShell
      title="Demande d'aérogommage"
      subtitle="Ajoutez un ou plusieurs objets à décaper, puis soumettez votre demande."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-5">
          {fields.map((field, index) => {
            const isOtherType =
              watch(`items.${index}.objectType`) === "Autre (veuillez préciser)";
            const isOtherCoating =
              watch(`items.${index}.coating`) === "Autre (précisez)";
            return (
              <div
                key={field.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-700">
                    Objet {index + 1}
                  </h3>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" /> Retirer
                    </button>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    label="Type d'objet"
                    required
                    error={errors.items?.[index]?.objectType?.message}
                  >
                    <Select {...register(`items.${index}.objectType`)} defaultValue="">
                      <option value="" disabled>
                        Sélectionner…
                      </option>
                      {AERO_OBJECT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {isOtherType && (
                    <Field label="Précisez l'objet" required>
                      <Input
                        {...register(`items.${index}.label`)}
                        placeholder="Type d'objet"
                      />
                    </Field>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Field
                    label="Hauteur (cm)"
                    required
                    error={errors.items?.[index]?.height?.message}
                  >
                    <Input type="number" step="any" {...register(`items.${index}.height`)} />
                  </Field>
                  <Field
                    label="Largeur (cm)"
                    required
                    error={errors.items?.[index]?.width?.message}
                  >
                    <Input type="number" step="any" {...register(`items.${index}.width`)} />
                  </Field>
                  <Field
                    label="Profondeur (cm)"
                    required
                    error={errors.items?.[index]?.depth?.message}
                  >
                    <Input type="number" step="any" {...register(`items.${index}.depth`)} />
                  </Field>
                  <Field label="Quantité">
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      {...register(`items.${index}.quantity`)}
                      placeholder="1"
                    />
                  </Field>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    label="Nature du bois"
                    required
                    error={errors.items?.[index]?.woodType?.message}
                  >
                    <Select {...register(`items.${index}.woodType`)} defaultValue="">
                      <option value="" disabled>
                        Sélectionner…
                      </option>
                      {WOOD_TYPES.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Décapage"
                    required
                    error={errors.items?.[index]?.stripping?.message}
                  >
                    <Select {...register(`items.${index}.stripping`)} defaultValue="">
                      <option value="" disabled>
                        Sélectionner…
                      </option>
                      {STRIPPING_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Revêtement"
                    required
                    error={errors.items?.[index]?.coating?.message}
                  >
                    <Select {...register(`items.${index}.coating`)} defaultValue="">
                      <option value="" disabled>
                        Sélectionner…
                      </option>
                      {COATING_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {isOtherCoating && (
                    <Field label="Précisez le revêtement" required>
                      <Input {...register(`items.${index}.coatingOther`)} />
                    </Field>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Checkbox
                      label="Retrait à domicile"
                      {...register(`items.${index}.retrieval`)}
                    />
                    {watch(`items.${index}.retrieval`) && (
                      <p className="mt-1.5 text-xs text-amber-700">
                        Des frais vous seront facturés.
                      </p>
                    )}
                  </div>
                  <div>
                    <Checkbox
                      label="Livraison à domicile"
                      {...register(`items.${index}.delivery`)}
                    />
                    {watch(`items.${index}.delivery`) && (
                      <p className="mt-1.5 text-xs text-amber-700">
                        Des frais vous seront facturés.
                      </p>
                    )}
                  </div>
                </div>

                <Field label="Commentaire">
                  <Textarea
                    {...register(`items.${index}.comment`)}
                    placeholder="Précisions sur cet objet…"
                  />
                </Field>

                <div>
                  <p className="text-sm font-medium text-zinc-700 mb-1.5">
                    Photos de l'objet
                  </p>
                  <PhotoUpload
                    value={(watch(`items.${index}.photos`) ?? []) as Id<"_storage">[]}
                    onChange={(ids) => setValue(`items.${index}.photos`, ids)}
                  />
                </div>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            onClick={() => append(emptyItem)}
            className="w-full"
          >
            <Plus className="h-4 w-4" /> Ajouter un objet
          </Button>
          {errors.items?.message && (
            <p className="text-sm text-red-500">{errors.items.message}</p>
          )}
        </div>

        <CustomerFields register={register} errors={errors} withAddress />

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Envoi en cours…" : "Soumettre ma demande"}
        </Button>
      </form>

      <Modal
        open={singleObjectConfirmOpen}
        onClose={() => {
          setSingleObjectConfirmOpen(false);
          setPendingSubmitData(null);
        }}
        title="Vérifier le nombre d'objets"
        className="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Vous êtes sur le point d'envoyer une demande avec un seul objet.
            Si vous souhaitez en ajouter d'autres, cliquez d'abord sur
            <span className="font-semibold text-zinc-900"> Ajouter un objet</span>.
          </p>
          <p className="text-sm text-zinc-600">
            Confirmez uniquement si votre demande concerne bien un seul objet.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setSingleObjectConfirmOpen(false);
                setPendingSubmitData(null);
              }}
            >
              Retour
            </Button>
            <Button
              onClick={async () => {
                if (!pendingSubmitData) return;
                setSingleObjectConfirmOpen(false);
                await submitRequest(pendingSubmitData);
              }}
            >
              Confirmer l'envoi
            </Button>
          </div>
        </div>
      </Modal>
    </FormShell>
  );
}
