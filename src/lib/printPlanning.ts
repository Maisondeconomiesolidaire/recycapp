import { escapeHtml, printIsolatedDocument } from "./printLabels";

/**
 * Impression du planning hebdomadaire des agents polyvalents.
 *
 * Une page par salarié : le planning se distribue en main propre, et deux
 * salariés sur la même feuille obligeraient à la photocopier pour chacun. Le
 * document est fabriqué à part (cf. `printIsolatedDocument`) : le thème sombre
 * de l'application sortirait sinon en aplats noirs à l'impression.
 */

export type PrintableSlot = {
  /** « 09:00 – 17:00 » */
  time: string;
  task: string;
  /** Marque les occurrences récurrentes, qui reviennent chaque semaine. */
  recurring?: boolean;
};

export type PrintableDay = {
  /** « Lundi 12 octobre » */
  label: string;
  slots: PrintableSlot[];
};

export type PrintablePlanning = {
  worker: string;
  days: PrintableDay[];
  /** Total des heures planifiées sur la semaine. */
  hours: number;
};

function formatHours(hours: number) {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1).replace(".", ",")} h`;
}

function planningPage(planning: PrintablePlanning, periodLabel: string, siteLabel: string) {
  const rows = planning.days
    .map((day) => {
      const slots = day.slots.length
        ? day.slots
            .map(
              (slot) =>
                `<div class="slot"><span class="time">${escapeHtml(slot.time)}</span>` +
                `<span class="task">${escapeHtml(slot.task)}${slot.recurring ? " <span class='rec'>(hebdomadaire)</span>" : ""}</span></div>`,
            )
            .join("")
        : `<div class="empty">—</div>`;
      return `<tr><th>${escapeHtml(day.label)}</th><td>${slots}</td></tr>`;
    })
    .join("");

  return `<section class="page">
  <header>
    <h1>${escapeHtml(planning.worker)}</h1>
    <p class="period">Planning du ${escapeHtml(periodLabel)}${siteLabel ? ` · ${escapeHtml(siteLabel)}` : ""}</p>
  </header>
  <table>${rows}</table>
  <footer>
    <span>Total planifié : <strong>${escapeHtml(formatHours(planning.hours))}</strong></span>
    <span class="signature">Signature</span>
  </footer>
</section>`;
}

/**
 * Ouvre la boîte d'impression sur le planning d'un ou plusieurs salariés.
 *
 * Un salarié sans aucun créneau de la semaine est tout de même imprimé : une
 * feuille vide dit « rien de prévu », une feuille absente laisse croire à un
 * oubli d'impression.
 */
export function printPlannings({
  plannings,
  periodLabel,
  siteLabel = "",
}: {
  plannings: PrintablePlanning[];
  periodLabel: string;
  siteLabel?: string;
}): void {
  if (plannings.length === 0) return;
  printIsolatedDocument({
    title:
      plannings.length === 1
        ? `Planning — ${plannings[0].worker}`
        : `Plannings — ${periodLabel}`,
    pageCss: "@page { size: A4 portrait; margin: 14mm; }",
    bodyCss: `
      .page { page-break-after: always; }
      .page:last-child { page-break-after: auto; }
      header { border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
      h1 { font-size: 20pt; margin: 0; }
      .period { font-size: 10pt; margin: 3px 0 0; color: #333; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #999; padding: 6px 8px; vertical-align: top; text-align: left; }
      th { width: 32%; font-size: 10pt; background: #f1f1f1; }
      .slot { display: flex; gap: 8px; font-size: 10pt; padding: 1px 0; }
      .time { min-width: 76px; font-variant-numeric: tabular-nums; font-weight: 700; }
      .task { flex: 1; }
      .rec { font-size: 8pt; color: #555; }
      .empty { font-size: 10pt; color: #777; }
      footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14px; font-size: 10pt; }
      .signature { border-bottom: 1px solid #000; width: 60mm; padding-bottom: 14mm; }
    `,
    bodyHtml: plannings
      .map((planning) => planningPage(planning, periodLabel, siteLabel))
      .join(""),
  });
}
