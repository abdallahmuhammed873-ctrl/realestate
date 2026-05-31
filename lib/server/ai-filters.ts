import { safeParseInternalAiSearchFilters } from "../ai-contract.ts";
import type { AiPropertySearchFilters } from "../ai-contract.ts";

type ExtractFiltersResult = {
  normalizedQuery: string;
  filters: AiPropertySearchFilters;
  warnings: string[];
};

const PROPERTY_TYPE_ALIASES: Record<string, string[]> = {
  APARTMENT: ["apartment", "apartments", "flat", "flats", "شقة", "شقق"],
  VILLA: ["villa", "villas", "standalone villa", "stand alone villa", "فيلا", "فلل"],
  DUPLEX: ["duplex", "دوبلكس"],
  PENTHOUSE: ["penthouse", "بنتهاوس"],
  CHALET: ["chalet", "chalets", "شاليه", "شاليهات"],
  LAND: ["land", "plot", "أرض", "قطعة أرض"],
  COMMERCIAL: ["commercial", "office", "retail", "clinic", "محل", "تجاري", "مكتب", "عيادة"]
};

const PROJECT_ALIASES: Record<string, string> = {
  aliva: "Aliva",
  lvls: "LVLS"
};

const LOCATION_ALIASES: Record<string, [string | null, string | null, string | null]> = {
  "fifth settlement": ["Cairo", "New Cairo", "Fifth Settlement"],
  "north 90 street": ["Cairo", "New Cairo", "North 90 Street"],
  "north 90": ["Cairo", "New Cairo", "North 90 Street"],
  "new cairo": ["Cairo", "New Cairo", null],
  heliopolis: ["Cairo", "Heliopolis", null],
  korba: ["Cairo", "Heliopolis", "Korba"],
  maadi: ["Cairo", "Maadi", null],
  degla: ["Cairo", "Maadi", "Degla"],
  cairo: ["Cairo", null, null],
  "sheikh zayed": ["Giza", "Sheikh Zayed", null],
  zayed: ["Giza", "Sheikh Zayed", null],
  "6th of october": ["Giza", "6th of October", null],
  "6 october": ["Giza", "6th of October", null],
  october: ["Giza", "6th of October", null],
  "beverly hills": ["Giza", "Sheikh Zayed", "Beverly Hills"],
  giza: ["Giza", null, null],
  "القاهرة الجديدة": ["Cairo", "New Cairo", null],
  "التجمع الخامس": ["Cairo", "New Cairo", "Fifth Settlement"],
  التجمع: ["Cairo", "New Cairo", null],
  القاهرة: ["Cairo", null, null],
  المعادي: ["Cairo", "Maadi", null],
  "مصر الجديدة": ["Cairo", "Heliopolis", null],
  الجيزة: ["Giza", null, null],
  "الشيخ زايد": ["Giza", "Sheikh Zayed", null],
  اكتوبر: ["Giza", "6th of October", null],
  أكتوبر: ["Giza", "6th of October", null],
  الساحل: ["North Coast", null, null],
  "الساحل الشمالي": ["North Coast", null, null],
  "north coast": ["North Coast", null, null],
  sahel: ["North Coast", null, null]
};

const AMENITY_ALIASES: Record<string, string> = {
  parking: "Parking",
  garage: "Parking",
  pool: "Pool",
  "swimming pool": "Pool",
  gym: "Gym",
  elevator: "Elevator",
  security: "Security",
  garden: "Garden",
  storage: "Storage",
  balcony: "Balcony",
  ac: "A/C",
  "a/c": "A/C",
  جراج: "Parking",
  باركينج: "Parking",
  مسبح: "Pool",
  حمام: "Pool",
  جيم: "Gym",
  مصعد: "Elevator",
  امن: "Security",
  أمن: "Security",
  حديقة: "Garden",
  بلكونة: "Balcony",
  تكييف: "A/C"
};

const GREETING_TOKENS = new Set(["hi", "hello", "hey", "hola", "مرحبا", "اهلا", "أهلا", "السلام", "هاي"]);
const CONTEXT_FOLLOWUP_TOKENS = new Set([
  "ok",
  "okay",
  "yes",
  "sure",
  "go ahead",
  "continue",
  "more details",
  "show more",
  "show me more",
  "show me more details",
  "show details",
  "tell me more",
  "more info",
  "details",
  "compare them",
  "show similar",
  "show similar properties",
  "refine search"
]);

const GENERIC_ONLY_FILTER_KEYS = new Set([
  "transaction",
  "type",
  "minPrice",
  "maxPrice",
  "minArea",
  "maxArea",
  "minBeds",
  "maxBeds",
  "minBaths",
  "maxBaths",
  "paymentType",
  "furnishing",
  "completionStatus",
  "hasGarden",
  "hasRoof",
  "amenities",
  "downPaymentMax",
  "installmentYearsMax",
  "installmentMonthlyMax"
]);

function normalizeCompactText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\u0600-\u06ff]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

function containsAny(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(token));
}

function parseMoney(raw: string) {
  const cleaned = raw.toLowerCase().replaceAll(",", "").replace(/egp|جنيه/g, "").trim();
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*(m|million|mn|k|thousand)?/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const unit = match[2];
  if (unit === "m" || unit === "million" || unit === "mn") return value * 1_000_000;
  if (unit === "k" || unit === "thousand") return value * 1_000;
  return value;
}

function collectTypes(question: string) {
  const matches: string[] = [];
  for (const [canonical, aliases] of Object.entries(PROPERTY_TYPE_ALIASES)) {
    if (aliases.some((alias) => question.includes(alias))) matches.push(canonical);
  }
  return matches.length > 0 ? matches : undefined;
}

function collectAmenities(question: string) {
  const amenities = Object.entries(AMENITY_ALIASES)
    .filter(([alias]) => question.includes(alias))
    .map(([, canonical]) => canonical);
  return Array.from(new Set(amenities));
}

function matchAlias(question: string, aliases: Record<string, string>) {
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (question.includes(alias)) return canonical;
  }
  return undefined;
}

function applyLocationAliases(question: string, payload: Record<string, unknown>) {
  const matches = Object.entries(LOCATION_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, [city, area, district]] of matches) {
    if (!question.includes(alias)) continue;
    if (city) payload.city = city;
    if (area) payload.area = area;
    if (district) payload.district = district;
    return;
  }
}

function detectTransaction(question: string) {
  if (containsAny(question, ["rent", "rental", "lease", "إيجار", "ايجار", "للإيجار", "للايجار"])) return "RENT";
  if (containsAny(question, ["vacation", "holiday", "summer", "مصيف", "ساحل", "اجازة", "إجازة"])) return "VACATION";
  if (containsAny(question, ["buy", "sale", "purchase", "own", "شراء", "للبيع"])) return "BUY";
  return undefined;
}

function detectSort(question: string) {
  if (containsAny(question, ["cheapest", "lowest price", "اقل سعر", "أقل سعر", "ارخص", "أرخص"])) return "PRICE_ASC";
  if (containsAny(question, ["most expensive", "highest price", "اغلى", "أغلى"])) return "PRICE_DESC";
  if (containsAny(question, ["largest", "biggest", "اكبر", "أكبر"])) return "AREA_DESC";
  if (containsAny(question, ["newest", "latest", "الأحدث", "الاحدث"])) return "NEWEST";
  return "FEATURED";
}

function applyPriceRanges(question: string, payload: Record<string, unknown>) {
  const maxPrice = question.match(
    /(?:under|max|up to|budget|less than|اقل من|أقل من|بحد أقصى|بحد اقصى)\s+([0-9][0-9,.\s]*(?:m|million|mn|k|thousand)?)/
  );
  if (maxPrice) {
    const parsed = parseMoney(maxPrice[1] ?? "");
    if (parsed !== null) payload.maxPrice = parsed;
  }

  const minPrice = question.match(
    /(?:from|starting at|min|over|more than|من|ابتداء من)\s+([0-9][0-9,.\s]*(?:m|million|mn|k|thousand)?)/
  );
  if (minPrice) {
    const parsed = parseMoney(minPrice[1] ?? "");
    if (parsed !== null) payload.minPrice = parsed;
  }
}

function applyAreaRanges(question: string, payload: Record<string, unknown>) {
  const maxArea = question.match(/(?:under|max|up to|less than|اقل من|أقل من)\s+(\d+(?:\.\d+)?)\s*(?:sqm|m2|sq m|متر)/);
  if (maxArea) payload.maxArea = Number(maxArea[1]);

  const minArea = question.match(
    /(?:from|min|starting at|more than|على الأقل|اقل مساحة|أقل مساحة)\s+(\d+(?:\.\d+)?)\s*(?:sqm|m2|sq m|متر)/
  );
  if (minArea) payload.minArea = Number(minArea[1]);
}

function applyRoomCounts(question: string, payload: Record<string, unknown>) {
  const beds = question.match(/(\d+)\s*(?:bed|beds|bedroom|bedrooms|غرفة|غرف)/);
  if (beds) {
    const value = Number(beds[1]);
    payload.minBeds = value;
    payload.maxBeds = value;
  }

  const baths = question.match(/(\d+)\s*(?:bath|baths|bathroom|bathrooms|حمام|حمامين)/);
  if (baths) {
    const value = Number(baths[1]);
    payload.minBaths = value;
    payload.maxBaths = value;
  }
}

function shouldKeepFreeTextQuery(normalized: string, structuredKeys: Set<string>) {
  if (structuredKeys.size > 0 && [...structuredKeys].every((key) => GENERIC_ONLY_FILTER_KEYS.has(key))) return false;
  const compact = normalizeCompactText(normalized);
  return !["i want", "i need", "looking for", "find me", "show me", "search for"].some((phrase) => compact.startsWith(phrase));
}

export function isGreeting(message: string) {
  const compact = normalizeCompactText(message);
  if (GREETING_TOKENS.has(compact)) return true;

  const englishToken = compact.replaceAll(" ", "");
  if (/^hi+$/.test(englishToken)) return true;
  if (/^hey+$/.test(englishToken)) return true;
  if (/^hel+o+$/.test(englishToken)) return true;
  return false;
}

export function isContextFollowup(message: string) {
  return CONTEXT_FOLLOWUP_TOKENS.has(normalizeCompactText(message));
}

export function extractAiFilters(message: string): ExtractFiltersResult {
  const normalizedQuery = message.trim().split(/\s+/).filter(Boolean).join(" ");
  const question = normalizedQuery.toLowerCase();
  const payload: Record<string, unknown> = { page: 1, pageSize: 10 };
  const warnings: string[] = [];

  if (isGreeting(question)) {
    return {
      normalizedQuery,
      filters: { page: 1, pageSize: 10, sort: "FEATURED" },
      warnings: ["Greeting only."]
    };
  }

  if (isContextFollowup(question)) {
    return {
      normalizedQuery,
      filters: { page: 1, pageSize: 10, sort: "FEATURED" },
      warnings: ["Context follow-up only; reuse prior filters if available."]
    };
  }

  const transaction = detectTransaction(question);
  if (transaction) payload.transaction = transaction;

  const types = collectTypes(question);
  if (types) payload.type = types;

  applyLocationAliases(question, payload);

  const projectName = matchAlias(question, PROJECT_ALIASES);
  if (projectName) payload.projectName = projectName;

  const unitCode = question.match(/\b(?:unit|code)\s*([a-z0-9\-_/]+)\b/i);
  if (unitCode) payload.unitCode = unitCode[1]?.toUpperCase();

  if (containsAny(question, ["garden", "حديقة"])) payload.hasGarden = true;
  if (containsAny(question, ["roof", "روف"])) payload.hasRoof = true;

  if (containsAny(question, ["installment", "installments", "تقسيط", "أقساط", "اقساط"])) payload.paymentType = "INSTALLMENTS";
  else if (containsAny(question, ["cash", "كاش", "نقد", "full payment"])) payload.paymentType = "CASH";

  if (containsAny(question, ["ready", "ready to move", "جاهز", "استلام فوري"])) payload.completionStatus = "READY";
  else if (containsAny(question, ["off plan", "under construction", "اوف بلان", "تحت الانشاء", "تحت الإنشاء"])) {
    payload.completionStatus = "OFF_PLAN";
  }

  if (containsAny(question, ["fully furnished", "furnished", "مفروش"])) payload.furnishing = "FULLY";
  else if (containsAny(question, ["semi furnished", "semi finished", "semi", "نصف تشطيب", "سيمي"])) payload.furnishing = "SEMI";
  else if (containsAny(question, ["unfurnished", "without furniture", "بدون فرش"])) payload.furnishing = "UNFURNISHED";

  const amenities = collectAmenities(question);
  if (amenities.length > 0) payload.amenities = amenities;

  applyPriceRanges(question, payload);
  applyAreaRanges(question, payload);
  applyRoomCounts(question, payload);

  const downPayment = question.match(/(?:down payment|dp|مقدم)(?: max)?\s+([0-9][0-9,.\s]*(?:m|million|mn|k|thousand)?)/);
  if (downPayment) {
    const parsed = parseMoney(downPayment[1] ?? "");
    if (parsed !== null) payload.downPaymentMax = parsed;
  }

  const installmentYears = question.match(/(\d+)\s*(?:year|years|سنة|سنين)/);
  if (installmentYears && payload.paymentType === "INSTALLMENTS") payload.installmentYearsMax = Number(installmentYears[1]);

  payload.sort = detectSort(question);

  const structuredKeys = new Set(Object.keys(payload).filter((key) => !["page", "pageSize", "sort"].includes(key)));
  if (structuredKeys.size === 0) {
    payload.q = normalizedQuery;
  } else if (structuredKeys.has("unitCode")) {
    delete payload.q;
  } else if (
    normalizedQuery.split(/\s+/).length >= 4 &&
    !["city", "area", "district", "projectName"].some((key) => structuredKeys.has(key)) &&
    shouldKeepFreeTextQuery(normalizedQuery, structuredKeys)
  ) {
    payload.q = normalizedQuery;
  }

  if (structuredKeys.size <= 1) {
    warnings.push("Limited structured filters were detected, so the assistant may need clarification.");
  }

  const parsed = safeParseInternalAiSearchFilters(payload);
  if (!parsed.success) {
    return {
      normalizedQuery,
      filters: { page: 1, pageSize: 10, sort: "FEATURED", q: normalizedQuery },
      warnings: [...warnings, "Filter validation failed; using a safe text search fallback."]
    };
  }

  return {
    normalizedQuery,
    filters: parsed.data,
    warnings
  };
}

export function mergeAiFilters(base: Partial<AiPropertySearchFilters>, extra: Partial<AiPropertySearchFilters>) {
  const merged: Record<string, unknown> = { ...base };
  const baseHasSpecificSearch = [
    "transaction",
    "type",
    "city",
    "area",
    "district",
    "projectName",
    "unitCode",
    "minPrice",
    "maxPrice"
  ].some((key) => merged[key] !== undefined);

  for (const [key, value] of Object.entries(extra)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "page" || key === "pageSize" || key === "sort") {
      merged[key] = value;
      continue;
    }
    if (key === "q" && baseHasSpecificSearch) continue;
    if (merged[key] === undefined || merged[key] === null || merged[key] === "" || (Array.isArray(merged[key]) && merged[key].length === 0)) {
      merged[key] = value;
    }
  }

  const parsed = safeParseInternalAiSearchFilters(merged);
  return parsed.success ? parsed.data : ({ page: 1, pageSize: 10, sort: "FEATURED" } satisfies AiPropertySearchFilters);
}

export function buildHistoryFilters(history: Array<{ role: "user" | "assistant"; content: string }>) {
  let merged: AiPropertySearchFilters = { page: 1, pageSize: 10, sort: "FEATURED" };
  for (const item of history.slice(-6)) {
    if (item.role !== "user") continue;
    merged = mergeAiFilters(merged, extractAiFilters(item.content).filters);
  }
  return merged;
}

export function buildSuggestedFilterKeys(filters: Partial<AiPropertySearchFilters>) {
  const ordered = [
    "transaction",
    "projectName",
    "city",
    "area",
    "district",
    "type",
    "minPrice",
    "maxPrice",
    "minBeds",
    "paymentType",
    "completionStatus",
    "hasGarden",
    "hasRoof"
  ];
  return ordered.filter((key) => filters[key as keyof AiPropertySearchFilters] !== undefined);
}

export function hasMeaningfulFilters(filters: Partial<AiPropertySearchFilters>) {
  return Object.keys(filters).some((key) => !["page", "pageSize", "sort"].includes(key));
}

export function shouldForceGroundedSearch(filters: Partial<AiPropertySearchFilters>) {
  if (!hasMeaningfulFilters(filters)) return false;
  if (filters.unitCode || filters.projectName) return true;
  const hasLocation = Boolean(filters.city || filters.area || filters.district);
  const hasTransaction = Boolean(filters.transaction);
  const hasBudget = Boolean(filters.minPrice !== undefined || filters.maxPrice !== undefined || filters.downPaymentMax !== undefined || filters.installmentMonthlyMax !== undefined);
  const hasType = Boolean(filters.type?.length);
  return Boolean(filters.q) || (hasTransaction && (hasLocation || hasBudget || hasType)) || (hasLocation && (hasType || hasBudget));
}

export function isSearchableFilterSet(filters: Partial<AiPropertySearchFilters>) {
  if (!hasMeaningfulFilters(filters)) return false;
  return [
    "q",
    "unitCode",
    "projectName",
    "city",
    "area",
    "district",
    "transaction",
    "type",
    "minPrice",
    "maxPrice"
  ].some((key) => filters[key as keyof AiPropertySearchFilters] !== undefined);
}

export function relaxAiFilters(filters: AiPropertySearchFilters) {
  const relaxed: Record<string, unknown> = { ...filters };
  const relaxedKeys: string[] = [];

  function drop(key: keyof AiPropertySearchFilters) {
    if (relaxed[key] !== undefined) {
      delete relaxed[key];
      relaxedKeys.push(key);
    }
  }

  if (relaxed.projectName) drop("projectName");
  else if (relaxed.district) drop("district");
  else if (relaxed.area && relaxed.city) drop("area");
  else if (typeof relaxed.maxPrice === "number") {
    relaxed.maxPrice = relaxed.maxPrice * 1.2;
    relaxedKeys.push("maxPrice");
  } else if (relaxed.type) drop("type");
  else if (relaxed.paymentType) drop("paymentType");
  else if (relaxed.minBeds !== undefined || relaxed.maxBeds !== undefined) {
    drop("minBeds");
    drop("maxBeds");
  } else if (relaxed.transaction) drop("transaction");

  const parsed = safeParseInternalAiSearchFilters(relaxed);
  return {
    filters: parsed.success ? parsed.data : filters,
    relaxedKeys
  };
}

export function isComparisonRequest(message: string) {
  const compact = normalizeCompactText(message);
  return containsAny(compact, ["compare", "comparison", "versus", "vs", "choose between", "which is better", "قارن", "مقارنة", "اختار", "أفضل"]);
}

export function shouldUseExternalResearch(message: string) {
  const compact = normalizeCompactText(message);
  return containsAny(compact, [
    "market trend",
    "latest",
    "current market",
    "outside data",
    "external data",
    "research",
    "news",
    "developer reputation",
    "mortgage",
    "interest rate",
    "اتجاهات السوق",
    "احدث",
    "الأحدث",
    "بحث خارجي",
    "بيانات خارجية"
  ]);
}
