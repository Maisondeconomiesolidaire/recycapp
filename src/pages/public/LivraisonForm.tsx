import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { FormShell, FormSection } from "../../components/public/FormShell";
import { CustomerFields } from "../../components/public/CustomerFields";
import { Field, Textarea } from "../../components/ui/Field";
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
  comment: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function LivraisonForm() {
  const navigate = useNavigate();
  const submit = useMutation(api.requests.submitLivraison);
  const [articlePhotos, setArticlePhotos] = useState<Id<"_storage">[]>([]);
  const [referencePhotos, setReferencePhotos] = useState<Id<"_storage">[]>([]);

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
      articlePhoto: articlePhotos[0],
      referencePhoto: referencePhotos[0],
    });
    navigate("/merci?type=livraison");
  }

  return (
    <FormShell
      title="Livraison d'un article"
      subtitle="Demandez la livraison d'un article à votre adresse. Nous calculons les frais et revenons vers vous."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <CustomerFields
          register={register}
          errors={errors}
          withAddress
          watch={watch}
          setValue={setValue}
          autofillProfile
        />

        <FormSection title="L'article à livrer">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm font-medium text-zinc-700">
                Photo de l'article
              </p>
              <PhotoUpload value={articlePhotos} onChange={setArticlePhotos} />
              <p className="mt-1.5 text-xs text-zinc-500">
                Aide notre équipe à identifier l'article.
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-zinc-700">
                Photo de la référence / code-barres
              </p>
              <PhotoUpload value={referencePhotos} onChange={setReferencePhotos} />
              <p className="mt-1.5 text-xs text-zinc-500">
                Facultatif — si l'article porte une étiquette.
              </p>
            </div>
          </div>
        </FormSection>

        <FormSection title="Commentaire">
          <Field label="Précisions (facultatif)">
            <Textarea
              {...register("comment")}
              placeholder="Détails sur l'article, contraintes d'accès, étage, créneau souhaité…"
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
