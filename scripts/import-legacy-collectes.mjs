import fs from "node:fs";
import path from "node:path";

const DEMANDS_CSV =
  "/Users/salem/Downloads/All Demands Debarras Jun 18 2026.csv";
const CLIENTS_CSV =
  "/Users/salem/Downloads/All Clients Export June 18 2026.csv";
const OUTPUT_DIR = path.resolve("tmp/imports");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "legacy-collectes-import.json");
const OUTPUT_REPORT = path.join(OUTPUT_DIR, "legacy-collectes-report.json");

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

function parseObjects(raw) {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function splitCollecteObjects(items) {
  const bigSet = new Set([
    "Meubles",
    "Gros appareil électroménager",
    "Écran",
    "Ecran",
  ]);

  const grosObjets = [];
  const petitsObjets = [];
  let grosObjetsAutre;
  let petitsObjetsAutre;

  for (const item of items) {
    if (item === "Autres" || item === "Autres (précisez)") {
      petitsObjets.push("Autres (précisez)");
      petitsObjetsAutre = "Autres";
      continue;
    }
    if (bigSet.has(item)) {
      grosObjets.push(item === "Ecran" ? "Écran" : item);
    } else {
      petitsObjets.push(item);
    }
  }

  return {
    grosObjets: grosObjets.length > 0 ? grosObjets : undefined,
    petitsObjets: petitsObjets.length > 0 ? petitsObjets : undefined,
    grosObjetsAutre,
    petitsObjetsAutre,
  };
}

function parseQuoteAmount(raw) {
  const match = raw.match(/TTC\s*:\s*([0-9\s,]+)\s*€/i);
  if (!match) return undefined;
  return parseNumber(match[1].replace(/\s/g, ""));
}

function inferSite(postalCode) {
  if (postalCode?.startsWith("60")) return "60";
  if (postalCode?.startsWith("76")) return "76";
  return undefined;
}

function compact(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  );
}

const demands = parseCsv(fs.readFileSync(DEMANDS_CSV, "utf8"));
const clients = parseCsv(fs.readFileSync(CLIENTS_CSV, "utf8"));
const clientMap = new Map(clients.map((client) => [client["unique id"], client]));

const imports = [];
const blocked = [];

for (const demand of demands) {
  const clientId = demand.Client.trim();
  const client = clientMap.get(clientId);

  if (!client) {
    blocked.push({
      uniqueId: demand["unique id"],
      reference: demand.REF,
      creationDate: demand["Creation Date"],
      address: demand.Adresse_Logement,
      city: demand.Ville,
      creator: demand.Creator,
      reason: clientId ? "client_not_found" : "client_missing",
    });
    continue;
  }

  const objectItems = parseObjects(demand.Objets);
  const quoteDetails = demand.Commentaire_Interne.trim() || undefined;
  const collectAddress = compact({
    address: demand.Adresse_Logement.trim() || undefined,
    postalCode: client["Code postal"].trim() || undefined,
    city: demand.Ville.trim() || client.Ville.trim() || undefined,
  });

  const collecte = compact({
    dismountable: parseBoolean(demand.Demontage),
    reusableGoodCondition: parseBoolean(demand.Bon_etat_Reemployable),
    sorted: parseBoolean(demand["Trié"] || demand.Classifie),
    noWaste: parseBoolean(demand.Collectable),
    housingType: demand.Type_Logement.trim() || undefined,
    floors: parseNumber(demand.Etage),
    parkingDistance: parseNumber(demand.Distance_Parking),
    parkingNearby: parseBoolean(demand.Parking_Proximite),
    collectAddress:
      Object.keys(collectAddress).length > 0 ? collectAddress : undefined,
    ...splitCollecteObjects(objectItems),
  });

  const customer = compact({
    firstName: client.Prenom.trim() || ".",
    lastName: client.Nom.trim() || ".",
    email: client.Email.trim(),
    phone: client.Telephone.trim(),
    address: client.Adresse_facturation.trim() || undefined,
    postalCode: client["Code postal"].trim() || undefined,
    city: client.Ville.trim() || undefined,
  });

  imports.push(
    compact({
      type: "collecte",
      stage: "nouveau",
      outcome: "open",
      requestOrigin: "external",
      complete:
        Boolean(customer.address) &&
        Boolean(customer.postalCode) &&
        Boolean(customer.city) &&
        Boolean(collectAddress.address) &&
        Boolean(collectAddress.postalCode) &&
        Boolean(collectAddress.city) &&
        objectItems.length > 0,
      collecteType: "indefini",
      processSteps: [],
      completedSteps: 0,
      site: inferSite(customer.postalCode),
      customer,
      comment: demand.Commentaire_Adresse.trim() || undefined,
      photos: [],
      collecte,
      quoteAmount: parseQuoteAmount(quoteDetails ?? ""),
      quoteDetails,
      createdAt: parseDate(demand["Creation Date"]),
      updatedAt: parseDate(demand["Modified Date"] || demand["Creation Date"]),
    }),
  );
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_JSON, JSON.stringify(imports, null, 2));
fs.writeFileSync(
  OUTPUT_REPORT,
  JSON.stringify(
    {
      totalDemands: demands.length,
      matchedClients: imports.length,
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
