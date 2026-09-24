import { format, subMilliseconds } from "date-fns";
import { fr } from "date-fns/locale";
import type { EventCalendarI18nOverrides } from "./event-calendar-i18n";

export const PLANNER_FRENCH: EventCalendarI18nOverrides = {
  labels: {
    today: "Aujourd’hui", previous: "Précédent", next: "Suivant",
    addEvent: "Nouvelle tâche", allDay: "Toute la journée",
    more: (count) => `+${count} autres`, noEvents: "Aucune tâche",
    loading: "Chargement des tâches", event: "tâche",
    events: (count) => `${count} tâche${count > 1 ? "s" : ""}`,
    selectView: "Choisir une vue", week: (number) => `Semaine ${number}`,
    resources: "Ressources", goToDate: "Choisir une date",
    dropNotAllowed: "Déplacement impossible ici", continues: "se poursuit",
    timeFrom: (time) => `À partir de ${time}`, timeUntil: (time) => `Jusqu’à ${time}`,
    toggleDayEvents: (count, expanded) => `${expanded ? "Masquer" : "Afficher"} ${count} tâches`,
    timeRange: (from, to) => `${from} – ${to}`,
  },
  viewNames: { month: "Mois", week: "Semaine", day: "Jour", days: (n) => `${n} jours`, agenda: "Agenda", resource: "Ressources" },
  formats: { dayTitle: "EEEE d MMMM yyyy", agendaDayHeader: "EEEE d MMMM", moreDayHeader: "EEEE d MMMM", timeGutter: "HH:mm", timeGutterMinute: "HH:mm", eventTime: "HH:mm" },
  functions: {
    formatTitle: (view, { date, activeRange }) => view === "day" || view === "resource"
      ? format(date, "EEEE d MMMM yyyy", { locale: fr })
      : view === "month" ? format(date, "MMMM yyyy", { locale: fr })
      : `${format(activeRange.start, "d MMM", { locale: fr })} – ${format(subMilliseconds(activeRange.end, 1), "d MMM yyyy", { locale: fr })}`,
  },
};
