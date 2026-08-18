import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Globe } from "lucide-react";
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
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";

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

const WEEKDAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

export function DepotForm() {
  const navigate = useNavigate();
  const submit = useMutation(api.requests.submitDepot);
  const [slotStart, setSlotStart] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
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

  // Changer de recyclerie invalide la date et le créneau déjà choisis : les
  // disponibilités ne sont pas les mêmes d'une recyclerie à l'autre.
  useEffect(() => {
    setSlotStart(null);
    setSelectedDate(null);
  }, [site]);

  /** Jours ouverts à la réservation (les lundis renvoyés par le serveur). */
  const openDays = useMemo(
    () => new Map((days ?? []).map((day) => [day.date, day])),
    [days],
  );

  const selectedDay = useMemo(
    () => (selectedDate ? openDays.get(format(selectedDate, "yyyy-MM-dd")) : undefined),
    [openDays, selectedDate],
  );

  // Le calendrier s'ouvre sur le premier lundi disponible plutôt que sur le
  // mois courant, qui peut n'en contenir aucun.
  const firstOpenDate = days?.[0]?.date;
  useEffect(() => {
    if (firstOpenDate) setMonth(startOfMonth(new Date(`${firstOpenDate}T12:00:00`)));
  }, [firstOpenDate]);

  const monthDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month],
  );

  // On ne navigue que dans les mois qui contiennent des créneaux.
  const openMonths = useMemo(
    () => new Set((days ?? []).map((day) => day.date.slice(0, 7))),
    [days],
  );
  const canGoPrevious = openMonths.has(format(subMonths(month, 1), "yyyy-MM"));
  const canGoNext = openMonths.has(format(addMonths(month, 1), "yyyy-MM"));

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
          {!site ? (
            <p className="text-sm text-zinc-500">
              Choisissez d'abord une recyclerie pour voir les créneaux disponibles.
            </p>
          ) : days === undefined ? (
            <p className="text-sm text-zinc-500">Chargement des créneaux…</p>
          ) : (
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Colonne date : seuls les lundis ouverts sont cliquables. */}
              <div>
                <p className="mb-5 flex items-center gap-2.5 text-sm font-bold uppercase tracking-wide text-zinc-900">
                  <CalendarDays className="h-5 w-5 text-brand-600" />
                  Date
                </p>
                <div className="mb-4 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!canGoPrevious}
                    onClick={() => setMonth((current) => subMonths(current, 1))}
                    className="rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Mois précédent"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    disabled={!canGoNext}
                    onClick={() => setMonth((current) => addMonths(current, 1))}
                    className="rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Mois suivant"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <p className="text-lg font-medium capitalize text-zinc-900">
                    {format(month, "MMMM yyyy", { locale: fr })}
                  </p>
                </div>
                <div className="grid grid-cols-7 gap-y-1 text-center">
                  {WEEKDAY_INITIALS.map((initial, index) => (
                    <span
                      key={`${initial}-${index}`}
                      className="pb-2 text-sm font-medium text-zinc-500"
                    >
                      {initial}
                    </span>
                  ))}
                  {monthDays.map((day) => {
                    const key = format(day, "yyyy-MM-dd");
                    const openDay = openDays.get(key);
                    const selected = selectedDate ? isSameDay(day, selectedDate) : false;
                    return (
                      <div key={key} className="flex justify-center py-0.5">
                        <button
                          type="button"
                          disabled={!openDay}
                          onClick={() => {
                            setSelectedDate(day);
                            setSlotStart(null);
                            setSlotError("");
                          }}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full text-base transition",
                            selected
                              ? "bg-brand-600 font-semibold text-white"
                              : openDay
                                ? "font-semibold text-zinc-900 hover:bg-brand-50 hover:text-brand-700"
                                : "cursor-default text-zinc-300",
                            !isSameMonth(day, month) && "invisible",
                          )}
                        >
                          {format(day, "d")}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Colonne heure : créneaux du lundi sélectionné. */}
              <div>
                <p className="mb-5 flex items-center gap-2.5 text-sm font-bold uppercase tracking-wide text-zinc-900">
                  <Clock className="h-5 w-5 text-brand-600" />
                  Heure
                </p>
                {!selectedDay ? (
                  <p className="text-sm text-zinc-500">
                    Sélectionnez une date pour voir les horaires.
                  </p>
                ) : (
                  <div className="grid max-h-[22rem] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
                    {selectedDay.slots.map((slot) => {
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
                            "rounded-xl border py-3.5 text-base font-medium transition",
                            selected
                              ? "border-brand-600 bg-brand-600 text-white"
                              : slot.available
                                ? "border-zinc-200 text-zinc-900 hover:border-brand-500 hover:text-brand-700"
                                : "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300",
                          )}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="flex items-center justify-center gap-2 border-t border-zinc-100 pt-5 text-sm text-zinc-500">
            <Globe className="h-4 w-4" />
            Toutes les heures sont au format (UTC+01:00) Bruxelles, Copenhague, Madrid, Paris
          </p>

          {slotStart && selectedDay ? (
            <p className="text-sm font-medium text-brand-700">
              Créneau retenu :{" "}
              <span className="capitalize">
                {dayFormatter.format(new Date(`${selectedDay.date}T12:00:00`))}
              </span>{" "}
              à {selectedDay.slots.find((slot) => slot.start === slotStart)?.label}
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
          <Field label="Ce que vous apportez (facultatif)">
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
