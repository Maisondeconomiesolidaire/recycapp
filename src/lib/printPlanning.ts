import { escapeHtml, printIsolatedDocument } from "./printLabels";

/**
 * Impression du planning hebdomadaire des agents polyvalents.
 *
 * Deux sorties, parce que les deux usages n'ont rien à voir :
 *
 * - le planning d'UN salarié se distribue en main propre — une page A4 aérée,
 *   avec une ligne de signature ;
 * - le planning de TOUTE l'équipe s'affiche au mur — une grille compacte
 *   (salariés en lignes, jours en colonnes) tenant sur une page en paysage.
 *
 * Le document est fabriqué à part (cf. `printIsolatedDocument`) : le thème
 * sombre de l'application sortirait sinon en aplats noirs.
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
  /** « Lun 12 » — en-tête de colonne de la grille d'équipe. */
  shortLabel: string;
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

function periodHeading(periodLabel: string, siteLabel: string) {
  return `Planning du ${escapeHtml(periodLabel)}${siteLabel ? ` · ${escapeHtml(siteLabel)}` : ""}`;
}

/* ─── Feuille individuelle ─────────────────────────────────────────────────── */

/**
 * Planning d'un salarié, à lui remettre : une page aérée et une signature.
 *
 * Les jours sans créneau sont conservés : la semaine se lit d'un bloc, et un
 * jour absent se confondrait avec une ligne oubliée.
 */
export function printWorkerPlanning({
  planning,
  periodLabel,
  siteLabel = "",
}: {
  planning: PrintablePlanning;
  periodLabel: string;
  siteLabel?: string;
}): void {
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

  printIsolatedDocument({
    title: `Planning — ${planning.worker}`,
    pageCss: "@page { size: A4 portrait; margin: 14mm; }",
    bodyCss: `
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
    bodyHtml: `<header>
    <h1>${escapeHtml(planning.worker)}</h1>
    <p class="period">${periodHeading(periodLabel, siteLabel)}</p>
  </header>
  <table>${rows}</table>
  <footer>
    <span>Total planifié : <strong>${escapeHtml(formatHours(planning.hours))}</strong></span>
    <span class="signature">Signature</span>
  </footer>`,
  });
}

/* ─── Grille d'équipe ──────────────────────────────────────────────────────── */

/**
 * Planning de toute l'équipe sur une grille salariés × jours.
 *
 * Tout est réglé pour tenir sur une page : paysage, corps de 7pt, colonnes de
 * largeur fixe et tâche sous son horaire plutôt qu'à côté. L'en-tête se répète
 * si la liste déborde malgré tout.
 */
export function printTeamPlanning({
  plannings,
  periodLabel,
  siteLabel = "",
}: {
  plannings: PrintablePlanning[];
  periodLabel: string;
  siteLabel?: string;
}): void {
  if (plannings.length === 0) return;
  const days = plannings[0].days;

  const head = `<thead><tr><th class="who">Salarié</th>${days
    .map((day) => `<th>${escapeHtml(day.shortLabel)}</th>`)
    .join("")}<th class="total">Total</th></tr></thead>`;

  const body = plannings
    .map((planning) => {
      const cells = planning.days
        .map((day) => {
          if (!day.slots.length) return `<td class="off"></td>`;
          const slots = day.slots
            .map(
              (slot) =>
                `<div class="slot"><span class="time">${escapeHtml(slot.time)}</span>` +
                `<span class="task">${escapeHtml(slot.task)}</span></div>`,
            )
            .join("");
          return `<td>${slots}</td>`;
        })
        .join("");
      return `<tr><th class="who">${escapeHtml(planning.worker)}</th>${cells}<td class="total">${escapeHtml(
        formatHours(planning.hours),
      )}</td></tr>`;
    })
    .join("");

  printIsolatedDocument({
    title: `Plannings — ${periodLabel}`,
    pageCss: "@page { size: A4 landscape; margin: 8mm; }",
    bodyCss: `
      h1 { font-size: 13pt; margin: 0 0 1mm; }
      .period { font-size: 8pt; margin: 0 0 3mm; color: #333; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      thead { display: table-header-group; }
      th, td { border: 1px solid #888; padding: 1.2mm 1.5mm; vertical-align: top; text-align: left; }
      thead th { background: #e8e8e8; font-size: 8pt; }
      .who { width: 30mm; font-size: 8pt; font-weight: 700; background: #f4f4f4; overflow-wrap: anywhere; }
      .total { width: 13mm; font-size: 8pt; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
      .slot { font-size: 7pt; line-height: 1.25; padding-bottom: 0.4mm; }
      .time { display: block; font-weight: 700; font-variant-numeric: tabular-nums; }
      .task { display: block; overflow-wrap: anywhere; }
      .off { background: repeating-linear-gradient(135deg, #fff, #fff 2mm, #f2f2f2 2mm, #f2f2f2 4mm); }
      tbody tr { page-break-inside: avoid; }
    `,
    bodyHtml: `<h1>${periodHeading(periodLabel, siteLabel)}</h1>
  <p class="period">${plannings.length} salarié${plannings.length > 1 ? "s" : ""} planifié${plannings.length > 1 ? "s" : ""}</p>
  <table>${head}<tbody>${body}</tbody></table>`,
  });
}
