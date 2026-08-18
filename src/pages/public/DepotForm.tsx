import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { CalendarClock, Check, Info } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import {
  DEPOT_SITES,
  DEPOT_VEHICLES,
  type DepotSite,
  type DepotVehicleType,
} from "../../lib/constants";
import { FormShell, FormSection } from "../../components/public/FormShell";
import { CustomerFields } from "../../components/public/CustomerFields";
import { Field, Select, Textarea } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/cn";

const schema = z.object({
  customer: z.object({
    firstName: z.string().min(1, "Prénom requis"),
    lastName: z.string().min(1, "Nom requis"),
    email: z.string().email("Email invalide"),
    phone: z.string().min(6, "Téléphone requis"),
  }),
  site: z.enum(["60", "76"], { message: "Choisissez une recyclerie" }),
  vehicleType: z.enum(["voiture", "camionnette", "remorque"], {
    message: "Choisissez un type de véhicule",
  }),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** « 9h » / « 14h » — les créneaux tombent toujours sur l'heure pile. */
function hourLabel(hour: number) {
  return `${hour}h`;
}

export function DepotForm() {
  const navigate = useNavigate();
  const submit = useMutation(api.requests.submitDepot);
  const [slotStart, setSlotStart] = useState<number | null>(null);
  const [slotError, setSlotError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const site = watch("site") as DepotSite | undefined;
  // Les créneaux dépendent de la recyclerie : rien à charger tant qu'elle n'est
  // pas choisie, et la disponibilité vient du serveur (source unique).
  const days = useQuery(api.requests.depotSlots, site ? { site } : "skip");

  // Changer de recyclerie invalide le créneau déjà sélectionné.
  useEffect(() => {
    setSlotStart(null);
  }, [site]);

  const selectedDay = useMemo(
    () => days?.find((day) => day.slots.some((slot) => slot.start === slotStart)),
    [days, slotStart],
  );

  async function onSubmit(data: FormData) {
    setSubmitError("");
    if (!slotStart) {
      setSlotError("Choisissez un créneau de dépôt.");
      return;
    }
    setSlotError("");
    try {
      await submit({
        customer: data.customer,
        photos: [],
        details: {
          site: data.site as DepotSite,
          slotStart,
          vehicleType: data.vehicleType as DepotVehicleType,
          description: data.description || undefined,
        },
      });
      navigate("/merci?type=depot");
    } catch (error) {
      // Cas typique : le créneau vient d'être pris pendant que le formulaire
      // était ouvert. Le message du serveur est explicite, on l'affiche tel quel.
      setSubmitError(
        error instanceof Error ? error.message : "Impossible d'enregistrer le dépôt.",
      );
      setSlotStart(null);
    }
  }

  return (
    <FormShell
      title="Déposer vos objets en recyclerie"
      subtitle="Choisissez votre recyclerie et votre créneau du lundi, nous vous accueillons à l'heure dite."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <CustomerFields
          register={register}
          errors={errors}
          watch={watch}
          setValue={setValue}
          autofillProfile
        />

        <FormSection title="Votre recyclerie">
          <Field label="Recyclerie" required error={errors.site?.message}>
            <Select {...register("site")} defaultValue="">
              <option value="" disabled>
                Sélectionner…
              </option>
              {DEPOT_SITES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </FormSection>

        <FormSection title="Votre créneau">
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Les dépôts se font <strong>uniquement le lundi</strong>. Un seul rendez-vous
              par créneau : ceux déjà réservés n'apparaissent pas comme disponibles.
            </p>
          </div>

          {!site ? (
            <p className="text-sm text-zinc-500">
              Choisissez d'abord une recyclerie pour voir les créneaux disponibles.
            </p>
          ) : days === undefined ? (
            <p className="text-sm text-zinc-500">Chargement des créneaux…</p>
          ) : (
            <div className="space-y-4">
              {days.map((day) => {
                const openSlots = day.slots.filter((slot) => slot.available);
                return (
                  <div
                    key={day.date}
                    className="rounded-2xl border border-zinc-200 p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold capitalize text-zinc-900">
                        {dayFormatter.format(new Date(`${day.date}T12:00:00`))}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {openSlots.length === 0
                          ? "Complet"
                          : `${openSlots.length} créneau${openSlots.length > 1 ? "x" : ""} libre${openSlots.length > 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {day.slots.map((slot) => {
                        const selected = slot.start === slotStart;
                        return (
                          <button
                            key={slot.start}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => {
                              setSlotStart(slot.start);
                              setSlotError("");
                            }}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition",
                              selected
                                ? "border-brand-600 bg-brand-600 text-white"
                                : slot.available
                                  ? "border-zinc-200 text-zinc-700 hover:border-brand-500 hover:text-brand-700"
                                  : "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300 line-through",
                            )}
                          >
                            {selected ? <Check className="h-3.5 w-3.5" /> : null}
                            {hourLabel(slot.hour)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {slotStart && selectedDay ? (
            <p className="flex items-center gap-2 text-sm font-medium text-brand-700">
              <CalendarClock className="h-4 w-4" />
              Créneau retenu :{" "}
              <span className="capitalize">
                {dayFormatter.format(new Date(`${selectedDay.date}T12:00:00`))}
              </span>{" "}
              à{" "}
              {hourLabel(
                selectedDay.slots.find((slot) => slot.start === slotStart)?.hour ?? 0,
              )}
            </p>
          ) : null}
          {slotError ? <p className="text-sm text-red-500">{slotError}</p> : null}
        </FormSection>

        <FormSection title="Votre véhicule">
          <Field
            label="Type de véhicule"
            required
            error={errors.vehicleType?.message}
            hint="Il nous permet de prévoir le temps et l'aide nécessaires au déchargement."
          >
            <Select {...register("vehicleType")} defaultValue="">
              <option value="" disabled>
                Sélectionner…
              </option>
              {DEPOT_VEHICLES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ce que vous apportez">
            <Textarea
              {...register("description")}
              placeholder="Ex : un canapé, deux cartons de vaisselle, un vélo…"
            />
          </Field>
        </FormSection>

        {submitError ? <p className="text-sm text-red-500">{submitError}</p> : null}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Envoi en cours…" : "Réserver mon créneau"}
        </Button>
      </form>
    </FormShell>
  );
}
