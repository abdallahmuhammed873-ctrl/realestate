import { createHash } from "crypto";
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
  comment?: string | null;
  has_garden?: boolean | null;
  has_roof?: boolean | null;
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

const PROJECT_ALIASES: Record<string, string> = {
  aliva: "Aliva",
  lvls: "LVLS",
  chillout: "Chillout Park",
  kingsway: "Kingsway",
  "i city oct": "iCity October",
  "i city new cairo": "iCity New Cairo",
  "the waterway new cairo": "The Waterway New Cairo",
  "the waterway villas": "The Waterway Villas"
};

const GENERIC_PROJECT_NAMES = new Set(["available units", "resale", "units availability report", "worksheet"]);

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = compactWhitespace(String(value));
  if (!text || /^(nan|none|<na>|null)$/i.test(text)) return null;
  return text;
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return false;
  return /^(true|1|yes)$/i.test(String(value).trim());
}

function titleCaseWords(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => (/^[A-Z0-9-]+$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(" ");
}

function normalizeProjectName(row: ImportedInventoryPayloadRow) {
  const raw =
    normalizeText(row.project_name) ??
    normalizeText(row.source_sheet) ??
    normalizeText(row.park) ??
    "Imported Inventory";
  const candidate = GENERIC_PROJECT_NAMES.has(raw.toLowerCase()) ? normalizeText(row.park) ?? "Imported Inventory" : raw;
  return PROJECT_ALIASES[candidate.toLowerCase()] ?? titleCaseWords(candidate.replace(/\s*-\s*/g, " "));
}

function stableIds(row: ImportedInventoryPayloadRow, projectName: string) {
  const sourceSheet = normalizeText(row.source_sheet) ?? "unknown-sheet";
  const sourceFile = normalizeText(row.source_file) ?? "unknown-file";
  const unitCode = normalizeText(row.unit_code);
  const rowIndex = row.row_index ?? 0;
  const key = [projectName.toLowerCase(), unitCode ?? `row-${rowIndex}`, sourceFile.toLowerCase(), sourceSheet.toLowerCase()].join("|");
  const digest = createHash("sha1").update(key).digest("hex").slice(0, 24);
  return {
    listingId: `imported-listing-${digest}`,
    propertyId: `imported-property-${digest}`
  };
}

function inferLocation(projectName: string, row: ImportedInventoryPayloadRow) {
  const combined = [projectName, row.location, row.source_sheet, row.project_name, row.comment]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (combined.includes("new cairo") || ["aliva", "the waterway"].some((keyword) => combined.includes(keyword))) {
    return { city: "Cairo", area: "New Cairo", district: "Fifth Settlement", lat: 30.0284, lng: 31.4913 };
  }

  if (combined.includes("oct") || combined.includes("zayed") || ["lvls", "kingsway", "chillout"].some((keyword) => combined.includes(keyword))) {
    const zayed = combined.includes("zayed") || combined.includes("lvls");
    return {
      city: "Giza",
      area: zayed ? "Sheikh Zayed" : "6th of October",
      district: zayed ? "Sheikh Zayed" : "6th of October",
      lat: zayed ? 30.0131 : 29.9668,
      lng: zayed ? 30.9725 : 30.9417
    };
  }

  if (combined.includes("north coast") || combined.includes("ras el")) {
    return { city: "Matrouh", area: "North Coast", district: "Ras El Hekma", lat: 31.0819, lng: 27.9157 };
  }

  return { city: "Cairo", area: projectName, district: projectName, lat: 30.0444, lng: 31.2357 };
}

function inferBedrooms(row: ImportedInventoryPayloadRow) {
  const direct = normalizeNumber(row.bedrooms);
  if (direct !== null) return Math.max(1, Math.round(direct));
  const text = [row.unit_type, row.category, row.model, row.comment].map(normalizeText).filter(Boolean).join(" ").toLowerCase();
  const match = text.match(/(\d+)\s*(?:br|bed|bedroom)/);
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
  const text = [row.unit_type, row.category, row.building_type, row.model, row.unit_name]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("duplex")) return "DUPLEX";
  if (text.includes("penthouse") || text.includes("roof")) return "PENTHOUSE";
  if (text.includes("chalet")) return "CHALET";
  if (text.includes("land") || text.includes("plot")) return "LAND";
  if (/(office|retail|commercial|clinic|shop)/.test(text)) return "COMMERCIAL";
  if (/(villa|townhouse|town house|twin house|i-villa|palace)/.test(text)) return "VILLA";
  return "APARTMENT";
}

function mapCompletionStatus(row: ImportedInventoryPayloadRow): PreparedImportedUnit["completionStatus"] {
  const text = [row.delivery_status, row.status].map(normalizeText).filter(Boolean).join(" ").toLowerCase();
  return /(ready|delivered|handover|completed|move)/.test(text) ? "READY" : "OFF_PLAN";
}

function mapFurnishing(row: ImportedInventoryPayloadRow): PreparedImportedUnit["furnishing"] {
  const text = normalizeText(row.finishing)?.toLowerCase() ?? "";
  if (text.includes("semi")) return "SEMI";
  if (/(finish|fully|lux|delivered)/.test(text)) return "FULLY";
  return "UNFURNISHED";
}

function deriveListingStatus(status: string | null): PreparedImportedUnit["listingStatus"] {
  const text = status?.toLowerCase() ?? "";
  if (/(sold|closed|cancelled|canceled|unavailable|inactive)/.test(text)) return "REJECTED";
  if (/(reserved|booked|hold|pending)/.test(text)) return "PENDING";
  return "APPROVED";
}

function prepareImportedUnit(row: ImportedInventoryPayloadRow): PreparedImportedUnit | null {
  const projectName = normalizeProjectName(row);
  const ids = stableIds(row, projectName);
  const areaSqm = Math.round(normalizeNumber(row.bua) ?? normalizeNumber(row.land_area) ?? normalizeNumber(row.garden_area) ?? normalizeNumber(row.roof_area) ?? 0);
  if (!areaSqm || areaSqm <= 0) return null;

  const unitCode = normalizeText(row.unit_code);
  const status = normalizeText(row.status) ?? normalizeText(row.delivery_status);
  const propertyType = mapPropertyType(row);
  const rawLabel = normalizeText(row.category) ?? normalizeText(row.unit_type) ?? normalizeText(row.unit_name) ?? propertyType.toLowerCase();
  const bedrooms = inferBedrooms(row);
  const completionStatus = mapCompletionStatus(row);
  const location = inferLocation(projectName, row);
  const gardenArea = normalizeNumber(row.garden_area);
  const roofArea = normalizeNumber(row.roof_area);

  return {
    listingId: ids.listingId,
    propertyId: ids.propertyId,
    listingStatus: deriveListingStatus(status),
    title: unitCode ? `${projectName} ${titleCaseWords(rawLabel)} ${unitCode}` : `${projectName} ${titleCaseWords(rawLabel)}`,
    description: [
      `Imported inventory unit for ${projectName}.`,
      unitCode ? `Unit code: ${unitCode}.` : null,
      normalizeText(row.delivery_status) ? `Delivery: ${normalizeText(row.delivery_status)}.` : null,
      status ? `Inventory status: ${status}.` : null
    ]
      .filter(Boolean)
      .join(" "),
    projectName,
    unitCode,
    inventoryStatus: status,
    type: propertyType,
    price: Math.round(normalizeNumber(row.price) ?? normalizeNumber(row.price_with_finishing) ?? 0) || null,
    pricePerSqm: Math.round(normalizeNumber(row.price_per_sqm) ?? 0) || null,
    bedrooms,
    bathrooms: inferBathrooms(row, bedrooms),
    areaSqm,
    landArea: Math.round(normalizeNumber(row.land_area) ?? 0) || null,
    gardenArea: Math.round(gardenArea ?? 0) || null,
    roofArea: Math.round(roofArea ?? 0) || null,
    hasGarden: normalizeBoolean(row.has_garden) || (gardenArea ?? 0) > 0,
    hasRoof: normalizeBoolean(row.has_roof) || (roofArea ?? 0) > 0,
    city: location.city,
    area: location.area,
    district: location.district,
    lat: location.lat,
    lng: location.lng,
    address: `${projectName}, ${location.district}`,
    furnishing: mapFurnishing(row),
    paymentType: completionStatus === "READY" ? "CASH" : "INSTALLMENTS",
    completionStatus,
    sourceFile: normalizeText(row.source_file),
    sourceSheet: normalizeText(row.source_sheet)
  };
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

export async function upsertImportedInventory(prisma: PrismaClient, rows: ImportedInventoryPayloadRow[]) {
  await ensureImportedInventoryOwner(prisma);

  const prepared = rows.map(prepareImportedUnit).filter((item): item is PreparedImportedUnit => Boolean(item));
  const deduped = new Map<string, PreparedImportedUnit>();
  for (const item of prepared) deduped.set(item.propertyId, item);

  const current = Array.from(deduped.values());
  const now = new Date();

  for (const item of current) {
    await prisma.listing.upsert({
      where: { id: item.listingId },
      update: {
        userId: IMPORTED_INVENTORY_OWNER_ID,
        status: item.listingStatus,
        feesPaid: true,
        adminNotes: "Imported from shared inventory source",
        reviewedBy: null,
        reviewedAt: item.listingStatus === "PENDING" ? null : now
      },
      create: {
        id: item.listingId,
        userId: IMPORTED_INVENTORY_OWNER_ID,
        status: item.listingStatus,
        feesPaid: true,
        adminNotes: "Imported from shared inventory source",
        reviewedBy: null,
        reviewedAt: item.listingStatus === "PENDING" ? null : now
      }
    });

    const propertyData = {
      listingId: item.listingId,
      title: item.title,
      description: item.description,
      projectName: item.projectName,
      unitCode: item.unitCode,
      inventoryStatus: item.inventoryStatus,
      transaction: "BUY" as const,
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
      sourceType: "IMPORTED" as const,
      sourceFile: item.sourceFile,
      sourceSheet: item.sourceSheet
    };

    await prisma.property.upsert({
      where: { id: item.propertyId },
      update: propertyData,
      create: {
        id: item.propertyId,
        ...propertyData
      }
    });
  }

  const staleDelete = await prisma.listing.deleteMany({
    where: {
      userId: IMPORTED_INVENTORY_OWNER_ID,
      id: { notIn: current.length > 0 ? current.map((item) => item.listingId) : ["__none__"] }
    }
  });

  return {
    rowsReceived: rows.length,
    rowsPrepared: current.length,
    rowsSkipped: rows.length - current.length,
    listingsUpserted: current.length,
    propertiesUpserted: current.length,
    staleListingsDeleted: staleDelete.count
  };
}
