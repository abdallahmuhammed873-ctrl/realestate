import { createHash } from "crypto";
import { spawnSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import { loadLocalEnv } from "../lib/server/load-env.ts";

loadLocalEnv();

export const IMPORTED_INVENTORY_OWNER_ID = "u-imported-inventory-owner";
const IMPORTED_INVENTORY_OWNER_EMAIL = "inventory-importer@local.demo";

type ImportedInventoryPayloadRow = {
  row_index?: number | null;
  source_file?: string | null;
  source_sheet?: string | null;
  project_name?: string | null;
  park?: string | null;
  stage?: string | null;
  unit_code?: string | null;
  unit_name?: string | null;
  unit_type?: string | null;
  category?: string | null;
  building_type?: string | null;
  price?: number | null;
  price_with_finishing?: number | null;
  price_per_sqm?: number | null;
  bua?: number | null;
  land_area?: number | null;
  garden_area?: number | null;
  roof_area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  finishing?: string | null;
  delivery_status?: string | null;
  status?: string | null;
  location?: string | null;
  model?: string | null;
  model_group_code?: string | null;
  owner?: string | null;
  comment?: string | null;
  has_garden?: boolean | null;
  has_roof?: boolean | null;
};

type ImportedInventorySummary = {
  rowsReceived: number;
  rowsPrepared: number;
  rowsSkipped: number;
  listingsUpserted: number;
  propertiesUpserted: number;
  staleListingsDeleted: number;
};

type PreparedImportedUnit = {
  listingId: string;
  propertyId: string;
  listingStatus: "APPROVED" | "PENDING" | "REJECTED";
  title: string;
  description: string;
  projectName: string;
  unitCode: string | null;
  inventoryStatus: string | null;
  type: "APARTMENT" | "VILLA" | "DUPLEX" | "PENTHOUSE" | "CHALET" | "LAND" | "COMMERCIAL";
  price: number | null;
  pricePerSqm: number | null;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  landArea: number | null;
  gardenArea: number | null;
  roofArea: number | null;
  hasGarden: boolean;
  hasRoof: boolean;
  city: string;
  area: string;
  district: string;
  lat: number;
  lng: number;
  address: string;
  furnishing: "FULLY" | "SEMI" | "UNFURNISHED";
  paymentType: "CASH" | "INSTALLMENTS";
  completionStatus: "OFF_PLAN" | "READY";
  sourceFile: string | null;
  sourceSheet: string | null;
};

const PYTHON_SCRIPT_PATH = "extras/chatbot/real_estate_chatbot/scripts/build_inventory_payload.py";
const RAW_INVENTORY_FOLDER = "extras/chatbot/real_estate_chatbot/data/raw";

const PROJECT_ALIASES: Record<string, string> = {
  aliva: "Aliva",
  chillout: "Chillout Park",
  crysta: "Crysta",
  grandvallyes: "Grand Valleys",
  jirian: "Jirian",
  kingsway: "Kingsway",
  lvls: "LVLS",
  mv4: "Mountain View 4",
  "ras elhakma": "Ras El Hekma",
  "the capitalway": "The Capitalway",
  "the view": "The View",
  "the waterway new cairo": "The Waterway New Cairo",
  "the waterway villas": "The Waterway Villas",
  triangle: "Triangle",
  "w signature": "W Signature",
  wbr1: "WBR1",
  "i city oct": "iCity October",
  "i city new cairo": "iCity New Cairo"
};

const GENERIC_PROJECT_NAMES = new Set([
  "available units",
  "resale",
  "sodic availability all projects",
  "units availability report",
  "worksheet"
]);

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeNullableText(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = compactWhitespace(String(value));
  if (!normalized) return null;
  if (/^(nan|none|<na>|null)$/i.test(normalized)) return null;
  return normalized;
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized || /^(nan|none|<na>|null)$/i.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function titleCaseWords(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (/^[A-Z0-9-]+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function normalizeProjectName(rawProjectName: unknown, rawSourceSheet: unknown, rawPark: unknown) {
  const projectCandidate = normalizeNullableText(rawProjectName);
  const sourceSheetCandidate = normalizeNullableText(rawSourceSheet);
  const parkCandidate = normalizeNullableText(rawPark);
  const baseCandidate =
    (projectCandidate && !GENERIC_PROJECT_NAMES.has(projectCandidate.toLowerCase()) ? projectCandidate : null) ??
    (sourceSheetCandidate && !GENERIC_PROJECT_NAMES.has(sourceSheetCandidate.toLowerCase()) ? sourceSheetCandidate : null) ??
    parkCandidate ??
    "Imported Inventory";

  const alias = PROJECT_ALIASES[baseCandidate.toLowerCase()];
  if (alias) return alias;
  if (/^\d{4}-\d{2}-\d{2}$/.test(baseCandidate)) {
    return parkCandidate ?? "Imported Inventory";
  }
  return titleCaseWords(baseCandidate.replace(/\s*-\s*/g, " "));
}

function stableImportedIds(row: ImportedInventoryPayloadRow, projectName: string) {
  const sourceSheet = normalizeNullableText(row.source_sheet) ?? "unknown-sheet";
  const sourceFile = normalizeNullableText(row.source_file) ?? "unknown-file";
  const unitCode = normalizeNullableText(row.unit_code);
  const rowIndex = row.row_index ?? 0;
  const baseKey = [projectName.toLowerCase(), unitCode ?? `row-${rowIndex}`, sourceFile.toLowerCase(), sourceSheet.toLowerCase()].join("|");
  const digest = createHash("sha1").update(baseKey).digest("hex").slice(0, 24);
  return {
    listingId: `imported-listing-${digest}`,
    propertyId: `imported-property-${digest}`
  };
}

function inferProjectLocation(projectName: string, row: ImportedInventoryPayloadRow) {
  const combined = [
    projectName,
    normalizeNullableText(row.location),
    normalizeNullableText(row.source_sheet),
    normalizeNullableText(row.project_name),
    normalizeNullableText(row.comment)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (combined.includes("new cairo") || ["aliva", "the waterway new cairo", "the waterway villas", "the view", "iCity New Cairo".toLowerCase()].some((keyword) => combined.includes(keyword.toLowerCase()))) {
    return {
      city: "Cairo",
      area: "New Cairo",
      district: "Fifth Settlement",
      lat: 30.0284,
      lng: 31.4913
    };
  }

  if (combined.includes("oct") || combined.includes("6 october") || combined.includes("sheikh zayed") || ["lvls", "kingsway", "chillout park", "iCity October".toLowerCase(), "grand valleys"].some((keyword) => combined.includes(keyword.toLowerCase()))) {
    return {
      city: "Giza",
      area: "West Cairo",
      district: combined.includes("zayed") || combined.includes("lvls") ? "Sheikh Zayed" : "6th of October",
      lat: combined.includes("zayed") || combined.includes("lvls") ? 30.0131 : 29.9668,
      lng: combined.includes("zayed") || combined.includes("lvls") ? 30.9725 : 30.9417
    };
  }

  if (combined.includes("capital")) {
    return {
      city: "New Administrative Capital",
      area: "New Capital",
      district: "R7",
      lat: 30.0156,
      lng: 31.7321
    };
  }

  if (combined.includes("ras el") || combined.includes("north coast")) {
    return {
      city: "Matrouh",
      area: "North Coast",
      district: "Ras El Hekma",
      lat: 31.0819,
      lng: 27.9157
    };
  }

  return {
    city: "Cairo",
    area: projectName,
    district: projectName,
    lat: 30.0444,
    lng: 31.2357
  };
}

function inferBedrooms(row: ImportedInventoryPayloadRow) {
  const direct = normalizeNumber(row.bedrooms);
  if (direct !== null) return Math.max(1, Math.round(direct));

  const combined = [
    normalizeNullableText(row.unit_type),
    normalizeNullableText(row.category),
    normalizeNullableText(row.model),
    normalizeNullableText(row.model_group_code),
    normalizeNullableText(row.comment)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (combined.includes("studio")) return 1;
  const match = combined.match(/(\d+)\s*(?:br|bed|bedroom)/);
  return match ? Math.max(1, Number(match[1])) : 1;
}

function inferBathrooms(row: ImportedInventoryPayloadRow, bedrooms: number) {
  const direct = normalizeNumber(row.bathrooms);
  if (direct !== null) return Math.max(1, Math.round(direct));
  if (bedrooms <= 1) return 1;
  if (bedrooms <= 3) return 2;
  return 3;
}

function mapPropertyType(row: ImportedInventoryPayloadRow): PreparedImportedUnit["type"] {
  const combined = [
    normalizeNullableText(row.unit_type),
    normalizeNullableText(row.category),
    normalizeNullableText(row.building_type),
    normalizeNullableText(row.model),
    normalizeNullableText(row.unit_name)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(penthouse|roof)/.test(combined)) return "PENTHOUSE";
  if (combined.includes("duplex")) return "DUPLEX";
  if (/(chalet)/.test(combined)) return "CHALET";
  if (/(land|plot)/.test(combined)) return "LAND";
  if (/(office|retail|commercial|clinic|shop)/.test(combined)) return "COMMERCIAL";
  if (/(villa|townhouse|town house|twin house|i-villa|palace)/.test(combined)) return "VILLA";
  return "APARTMENT";
}

function mapFurnishing(row: ImportedInventoryPayloadRow): PreparedImportedUnit["furnishing"] {
  const text = normalizeNullableText(row.finishing)?.toLowerCase() ?? "";
  if (/(semi)/.test(text)) return "SEMI";
  if (/(finish|fully|lux|delivered)/.test(text)) return "FULLY";
  return "UNFURNISHED";
}

function mapCompletionStatus(row: ImportedInventoryPayloadRow): PreparedImportedUnit["completionStatus"] {
  const text = [normalizeNullableText(row.delivery_status), normalizeNullableText(row.status)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/(ready|delivered|partial delivery|handover|completed|move)/.test(text)) return "READY";
  return "OFF_PLAN";
}

function mapPaymentType(completionStatus: PreparedImportedUnit["completionStatus"]): PreparedImportedUnit["paymentType"] {
  return completionStatus === "READY" ? "CASH" : "INSTALLMENTS";
}

function normalizeInventoryStatus(row: ImportedInventoryPayloadRow) {
  return normalizeNullableText(row.status) ?? normalizeNullableText(row.delivery_status);
}

function deriveListingStatus(inventoryStatus: string | null): PreparedImportedUnit["listingStatus"] {
  const normalized = inventoryStatus?.toLowerCase() ?? "";
  if (/(sold|closed|cancelled|canceled|unavailable|inactive)/.test(normalized)) return "REJECTED";
  if (/(reserved|booked|hold|pending)/.test(normalized)) return "PENDING";
  return "APPROVED";
}

function buildImportedTitle(projectName: string, propertyType: PreparedImportedUnit["type"], row: ImportedInventoryPayloadRow) {
  const rawLabel =
    normalizeNullableText(row.category) ??
    normalizeNullableText(row.unit_type) ??
    normalizeNullableText(row.unit_name) ??
    propertyType.toLowerCase();
  const humanType = titleCaseWords(rawLabel.replace(/[_-]+/g, " "));
  const unitCode = normalizeNullableText(row.unit_code);
  return unitCode ? `${projectName} ${humanType} ${unitCode}` : `${projectName} ${humanType}`;
}

function buildImportedDescription(projectName: string, row: ImportedInventoryPayloadRow) {
  const parts = [
    `Imported inventory unit for ${projectName}.`,
    normalizeNullableText(row.unit_code) ? `Unit code: ${normalizeNullableText(row.unit_code)}.` : null,
    normalizeNullableText(row.park) ? `Park: ${normalizeNullableText(row.park)}.` : null,
    normalizeNullableText(row.stage) ? `Stage: ${normalizeNullableText(row.stage)}.` : null,
    normalizeNullableText(row.model) ? `Model: ${normalizeNullableText(row.model)}.` : null,
    normalizeNullableText(row.delivery_status) ? `Delivery: ${normalizeNullableText(row.delivery_status)}.` : null,
    normalizeNullableText(row.status) ? `Inventory status: ${normalizeNullableText(row.status)}.` : null
  ].filter(Boolean);
  return parts.join(" ");
}

function roundNullable(value: number | null) {
  return value === null ? null : Math.round(value);
}

function prepareImportedUnit(row: ImportedInventoryPayloadRow): PreparedImportedUnit | null {
  const projectName = normalizeProjectName(row.project_name, row.source_sheet, row.park);
  const ids = stableImportedIds(row, projectName);
  const unitCode = normalizeNullableText(row.unit_code);
  const price = roundNullable(normalizeNumber(row.price) ?? normalizeNumber(row.price_with_finishing));
  const areaSqm = roundNullable(normalizeNumber(row.bua) ?? normalizeNumber(row.land_area) ?? normalizeNumber(row.garden_area) ?? normalizeNumber(row.roof_area));
  if (!projectName || !areaSqm || areaSqm <= 0) return null;

  const inventoryStatus = normalizeInventoryStatus(row);
  const listingStatus = deriveListingStatus(inventoryStatus);
  const propertyType = mapPropertyType(row);
  const bedrooms = inferBedrooms(row);
  const bathrooms = inferBathrooms(row, bedrooms);
  const location = inferProjectLocation(projectName, row);
  const completionStatus = mapCompletionStatus(row);

  return {
    listingId: ids.listingId,
    propertyId: ids.propertyId,
    listingStatus,
    title: buildImportedTitle(projectName, propertyType, row),
    description: buildImportedDescription(projectName, row),
    projectName,
    unitCode,
    inventoryStatus,
    type: propertyType,
    price,
    pricePerSqm: roundNullable(normalizeNumber(row.price_per_sqm)),
    bedrooms,
    bathrooms,
    areaSqm,
    landArea: roundNullable(normalizeNumber(row.land_area)),
    gardenArea: roundNullable(normalizeNumber(row.garden_area)),
    roofArea: roundNullable(normalizeNumber(row.roof_area)),
    hasGarden: normalizeBoolean(row.has_garden) || (normalizeNumber(row.garden_area) ?? 0) > 0,
    hasRoof: normalizeBoolean(row.has_roof) || (normalizeNumber(row.roof_area) ?? 0) > 0,
    city: location.city,
    area: location.area,
    district: location.district,
    lat: location.lat,
    lng: location.lng,
    address: `${projectName}, ${location.district}`,
    furnishing: mapFurnishing(row),
    paymentType: mapPaymentType(completionStatus),
    completionStatus,
    sourceFile: normalizeNullableText(row.source_file),
    sourceSheet: normalizeNullableText(row.source_sheet)
  };
}

function pythonInvocationCandidates() {
  const envPython = normalizeNullableText(process.env.PYTHON_BIN);
  return [
    envPython ? { command: envPython, args: [] as string[] } : null,
    { command: "py", args: ["-3"] },
    { command: "python", args: [] },
    { command: "python3", args: [] }
  ].filter(Boolean) as Array<{ command: string; args: string[] }>;
}

export async function ensureImportedInventoryOwner(prisma: PrismaClient) {
  return prisma.user.upsert({
    where: { email: IMPORTED_INVENTORY_OWNER_EMAIL },
    update: {
      id: IMPORTED_INVENTORY_OWNER_ID,
      name: "Imported Inventory",
      phone: "+201000000099",
      role: "SELLER",
      blocked: false,
      isCompanyAccount: true,
      companyOwnerId: null
    },
    create: {
      id: IMPORTED_INVENTORY_OWNER_ID,
      name: "Imported Inventory",
      email: IMPORTED_INVENTORY_OWNER_EMAIL,
      phone: "+201000000099",
      password: "imported-inventory-only",
      role: "SELLER",
      blocked: false,
      isCompanyAccount: true
    }
  });
}

export function loadImportedInventoryPayload(projectRoot = process.cwd()) {
  const errors: string[] = [];
  for (const candidate of pythonInvocationCandidates()) {
    const result = spawnSync(candidate.command, [...candidate.args, PYTHON_SCRIPT_PATH, "--raw-folder", RAW_INVENTORY_FOLDER, "--format", "json"], {
      cwd: projectRoot,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 64
    });

    if (result.error) {
      errors.push(`${candidate.command}: ${result.error.message}`);
      continue;
    }
    if (result.status !== 0) {
      errors.push(`${candidate.command}: ${result.stderr || `exit code ${result.status}`}`);
      continue;
    }

    try {
      const parsed = JSON.parse(result.stdout) as ImportedInventoryPayloadRow[];
      if (!Array.isArray(parsed)) {
        throw new Error("Python inventory builder did not return a JSON array.");
      }
      return parsed;
    } catch (error) {
      errors.push(`${candidate.command}: ${(error as Error).message}`);
    }
  }

  throw new Error(`Unable to build AI inventory payload.\n${errors.join("\n")}`);
}

export async function upsertImportedInventory(prisma: PrismaClient, rows: ImportedInventoryPayloadRow[]) {
  await ensureImportedInventoryOwner(prisma);

  const prepared = rows
    .map(prepareImportedUnit)
    .filter((item): item is PreparedImportedUnit => Boolean(item));

  const deduped = new Map<string, PreparedImportedUnit>();
  for (const item of prepared) {
    deduped.set(item.propertyId, item);
  }

  const current = Array.from(deduped.values());
  const now = new Date();

  for (const item of current) {
    await prisma.listing.upsert({
      where: { id: item.listingId },
      update: {
        userId: IMPORTED_INVENTORY_OWNER_ID,
        status: item.listingStatus,
        feesPaid: true,
        adminNotes: "Imported from shared AI inventory source",
        reviewedBy: null,
        reviewedAt: item.listingStatus === "PENDING" ? null : now
      },
      create: {
        id: item.listingId,
        userId: IMPORTED_INVENTORY_OWNER_ID,
        status: item.listingStatus,
        feesPaid: true,
        adminNotes: "Imported from shared AI inventory source",
        reviewedBy: null,
        reviewedAt: item.listingStatus === "PENDING" ? null : now
      }
    });

    await prisma.property.upsert({
      where: { id: item.propertyId },
      update: {
        listingId: item.listingId,
        title: item.title,
        description: item.description,
        projectName: item.projectName,
        unitCode: item.unitCode,
        inventoryStatus: item.inventoryStatus,
        transaction: "BUY",
        type: item.type,
        price: item.price,
        rentPrice: null,
        currency: "EGP",
        pricePerSqm: item.pricePerSqm,
        bedrooms: item.bedrooms,
        bathrooms: item.bathrooms,
        areaSqm: item.areaSqm,
        landArea: item.landArea,
        gardenArea: item.gardenArea,
        roofArea: item.roofArea,
        hasGarden: item.hasGarden,
        hasRoof: item.hasRoof,
        lat: item.lat,
        lng: item.lng,
        address: item.address,
        city: item.city,
        area: item.area,
        district: item.district,
        furnishing: item.furnishing,
        paymentType: item.paymentType,
        completionStatus: item.completionStatus,
        amenities: [item.hasGarden ? "Garden" : null, item.hasRoof ? "Roof" : null].filter(Boolean) as string[],
        images: [],
        installmentDownPayment: null,
        installmentYears: null,
        installmentMonthly: null,
        sourceType: "IMPORTED",
        sourceFile: item.sourceFile,
        sourceSheet: item.sourceSheet
      },
      create: {
        id: item.propertyId,
        listingId: item.listingId,
        title: item.title,
        description: item.description,
        projectName: item.projectName,
        unitCode: item.unitCode,
        inventoryStatus: item.inventoryStatus,
        transaction: "BUY",
        type: item.type,
        price: item.price,
        rentPrice: null,
        currency: "EGP",
        pricePerSqm: item.pricePerSqm,
        bedrooms: item.bedrooms,
        bathrooms: item.bathrooms,
        areaSqm: item.areaSqm,
        landArea: item.landArea,
        gardenArea: item.gardenArea,
        roofArea: item.roofArea,
        hasGarden: item.hasGarden,
        hasRoof: item.hasRoof,
        lat: item.lat,
        lng: item.lng,
        address: item.address,
        city: item.city,
        area: item.area,
        district: item.district,
        furnishing: item.furnishing,
        paymentType: item.paymentType,
        completionStatus: item.completionStatus,
        amenities: [item.hasGarden ? "Garden" : null, item.hasRoof ? "Roof" : null].filter(Boolean) as string[],
        images: [],
        sourceType: "IMPORTED",
        sourceFile: item.sourceFile,
        sourceSheet: item.sourceSheet
      }
    });
  }

  const currentListingIds = current.map((item) => item.listingId);
  const staleDelete = await prisma.listing.deleteMany({
    where: {
      userId: IMPORTED_INVENTORY_OWNER_ID,
      id: { notIn: currentListingIds.length > 0 ? currentListingIds : ["__none__"] }
    }
  });

  return {
    rowsReceived: rows.length,
    rowsPrepared: current.length,
    rowsSkipped: rows.length - current.length,
    listingsUpserted: current.length,
    propertiesUpserted: current.length,
    staleListingsDeleted: staleDelete.count
  } satisfies ImportedInventorySummary;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = loadImportedInventoryPayload();
    const summary = await upsertImportedInventory(prisma, rows);
    console.log("AI inventory import completed");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
