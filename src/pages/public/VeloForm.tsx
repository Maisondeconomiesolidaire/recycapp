import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { BIKE_TYPES, BIKE_SERVICES, BIKE_CONDITIONS } from "../../lib/constants";
import { FormShell, FormSection } from "../../components/public/FormShell";
import { CustomerFields } from "../../components/public/CustomerFields";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { PhotoUpload } from "../../components/ui/PhotoUpload";

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
  bikeType: z.string().min(1, "Sélectionnez le type de vélo"),
  service: z.string().min(1, "Sélectionnez la prestation"),
  brand: z.string().optional(),
  condition: z.string().optional(),
  description: z.string().optional(),
  comment: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function VeloForm() {
  const navigate = useNavigate();
  const submit = useMutation(api.requests.submitVelo);
  const [photos, setPhotos] = useState<Id<"_storage">[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    await submit({
      customer: data.customer,
      comment: data.comment || undefined,
      photos,
      details: {
        bikeType: data.bikeType,
        service: data.service,
        brand: data.brand || undefined,
        condition: data.condition || undefined,
        description: data.description || undefined,
      },
    });
    navigate("/merci?type=velo");
  }

  return (
    <FormShell
      title="Cycle en Bray — Atelier vélo"
      subtitle="Réparation, entretien, don ou recherche d'un vélo. Décrivez votre besoin."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <FormSection title="Votre vélo">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Type de vélo"
              required
              error={errors.bikeType?.message}
            >
              <Select {...register("bikeType")} defaultValue="">
                <option value="" disabled>
                  Sélectionner…
                </option>
                {BIKE_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Prestation souhaitée"
              required
              error={errors.service?.message}
            >
              <Select {...register("service")} defaultValue="">
                <option value="" disabled>
                  Sélectionner…
                </option>
                {BIKE_SERVICES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Marque / modèle">
              <Input {...register("brand")} placeholder="Ex : Peugeot, Btwin…" />
            </Field>
            <Field label="État général">
              <Select {...register("condition")} defaultValue="">
                <option value="">Non précisé</option>
                {BIKE_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Description du besoin / de la panne">
            <Textarea
              {...register("description")}
              placeholder="Ex : crevaison, freins à régler, vélo qui déraille…"
            />
          </Field>
        </FormSection>

        <FormSection title="Commentaire & photos">
          <Field label="Commentaire">
            <Textarea {...register("comment")} />
          </Field>
          <div>
            <p className="text-sm font-medium text-zinc-700 mb-1.5">
              Photos du vélo
            </p>
            <PhotoUpload value={photos} onChange={setPhotos} />
          </div>
        </FormSection>

        <CustomerFields
          register={register}
          errors={errors}
          withAddress
          watch={watch}
          setValue={setValue}
          autofillProfile
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Envoi en cours…" : "Envoyer ma demande"}
        </Button>
      </form>
    </FormShell>
  );
}
