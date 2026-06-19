import fs from "node:fs";
import path from "node:path";

const DEMANDS_CSV =
  "/Users/salem/Downloads/All Demand Requests Aerogommages Jun 18 2026.csv";
const CLIENTS_CSV =
  "/Users/salem/Downloads/All Clients Export June 18 2026.csv";
const OUTPUT_DIR = path.resolve("tmp/imports");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "legacy-aerogommages-import.json");
const OUTPUT_REPORT = path.join(OUTPUT_DIR, "legacy-aerogommages-report.json");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift() ?? [];
  return rows
    .filter((currentRow) => currentRow.some((value) => value !== ""))
    .map((currentRow) =>
      Object.fromEntries(headers.map((header, index) => [header, currentRow[index] ?? ""])),
    );
}

function parseBoolean(value) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "oui") return true;
  if (normalized === "non") return false;
  return undefined;
}

function parseNumber(value) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return undefined;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : undefined;
}

function parseDate(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function compact(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  );
}

function normalizeObjectType(value) {
  const normalized = value.trim();
  if (!normalized || normalized === "Autre") {
    return "Autre (veuillez préciser)";
  }
  return normalized;
}

function normalizeCoating(value) {
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized === "Autre") return "Autre (précisez)";
  if (normalized === "Lasure, teinte") return "Lasure / Teinte";
  return normalized;
}

function inferSite(postalCode) {
  if (postalCode?.startsWith("60")) return "60";
  if (postalCode?.startsWith("76")) return "76";
  return undefined;
}

function buildAerogommageItem(row) {
  const rawComment = row["Commentaire / Remarque"].trim();
  const objectType = normalizeObjectType(row.Type_objet);

  return compact({
    objectType,
    label:
      objectType === "Autre (veuillez préciser)" && rawComment
        ? rawComment
        : undefined,
    height: parseNumber(row["Hauteur (cm)"]),
    width: parseNumber(row["Largeur (cm)"]),
    depth: parseNumber(row.Profondeur),
    quantity: parseNumber(row.Quantite),
    woodType: row.Nature_Bois.trim() || undefined,
    stripping: row.Decapage.trim() || undefined,
    coating: normalizeCoating(row.Revetement),
    delivery: parseBoolean(row.Livraison),
    retrieval: parseBoolean(row.Retrait),
    comment:
      objectType === "Autre (veuillez préciser)" ? undefined : rawComment || undefined,
  });
}

const demandRows = parseCsv(fs.readFileSync(DEMANDS_CSV, "utf8"));
const clientRows = parseCsv(fs.readFileSync(CLIENTS_CSV, "utf8"));
const clientMap = new Map(clientRows.map((client) => [client["unique id"], client]));

const groups = new Map();
for (const row of demandRows) {
  const clientId = row.Client.trim();
  const key = clientId ? `${row.REF}__${clientId}` : `${row.REF}__NOCLIENT`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}

const imports = [];
const blocked = [];

for (const rows of groups.values()) {
  const first = rows[0];
  const clientId = first.Client.trim();
  const client = clientMap.get(clientId);

  if (!client) {
    blocked.push({
      reference: first.REF,
      clientId: clientId || null,
      groupedRows: rows.length,
      creationDates: [...new Set(rows.map((row) => row["Creation Date"]))],
      reason: clientId ? "client_not_found" : "client_missing",
    });
    continue;
  }

  const customer = compact({
    firstName: client.Prenom.trim() || ".",
    lastName: client.Nom.trim() || ".",
    email: client.Email.trim(),
    phone: client.Telephone.trim(),
    address: client.Adresse_facturation.trim() || undefined,
    postalCode: client["Code postal"].trim() || undefined,
    city: client.Ville.trim() || undefined,
  });

  const aerogommageItems = rows.map(buildAerogommageItem);
  const uniqueComments = [...new Set(rows.map((row) => row["Commentaire / Remarque"].trim()).filter(Boolean))];
  const quoteAmount = rows
    .map((row) => parseNumber(row.Montant))
    .find((value) => value !== undefined);
  const estimatedHours = rows
    .map((row) => parseNumber(row.Temps_estime))
    .find((value) => value !== undefined);
  const actualHours = rows
    .map((row) => parseNumber(row.Temps_Passe_Reel))
    .find((value) => value !== undefined);
  imports.push(
    compact({
      type: "aerogommage",
      stage: "nouveau",
      outcome: "open",
      requestOrigin: "external",
      complete: first.Complete.trim().toLowerCase() === "oui",
      processSteps: [
        "Contact pris",
        "Devis édité",
        "Devis signé",
        "Prestation planifiée",
        "Prestation terminée",
        "Facture éditée",
        "Facture réglée",
      ],
      completedSteps: 0,
      site: inferSite(customer.postalCode),
      estimatedHours,
      actualHours,
      quoteAmount,
      customer,
      comment: uniqueComments.length > 0 ? uniqueComments.join("\n\n") : undefined,
      photos: [],
      aerogommage: aerogommageItems,
      createdAt: Math.min(...rows.map((row) => parseDate(row["Creation Date"]))),
      updatedAt: Math.max(...rows.map((row) => parseDate(row["Modified Date"] || row["Creation Date"]))),
    }),
  );
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_JSON, JSON.stringify(imports, null, 2));
fs.writeFileSync(
  OUTPUT_REPORT,
  JSON.stringify(
    {
      sourceRows: demandRows.length,
      requestsAfterGrouping: groups.size,
      readyToImport: imports.length,
      blocked,
    },
    null,
    2,
  ),
);

console.log(
  JSON.stringify(
    {
      output: OUTPUT_JSON,
      report: OUTPUT_REPORT,
      readyToImport: imports.length,
      blocked: blocked.length,
    },
    null,
    2,
  ),
);
