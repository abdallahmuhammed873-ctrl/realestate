from __future__ import annotations

import re
from typing import Iterable

from service_contract import AiPropertyFilters, ExtractFiltersResponse

PROPERTY_TYPE_ALIASES = {
    "APARTMENT": ["apartment", "apartments", "flat", "flats", "شقة", "شقق"],
    "VILLA": ["villa", "villas", "standalone villa", "stand alone villa", "فيلا", "فلل"],
    "DUPLEX": ["duplex", "دوبلكس"],
    "PENTHOUSE": ["penthouse", "بنتهاوس"],
    "CHALET": ["chalet", "chalets", "شاليه", "شاليهات"],
    "LAND": ["land", "plot", "أرض", "قطعة أرض"],
    "COMMERCIAL": ["commercial", "office", "retail", "clinic", "محل", "تجاري", "مكتب", "عيادة"],
}

PROJECT_ALIASES = {
    "aliva": "Aliva",
    "lvls": "LVLS",
}

LOCATION_ALIASES = {
    "cairo": ("Cairo", None, None),
    "new cairo": ("Cairo", "New Cairo", None),
    "fifth settlement": ("Cairo", "New Cairo", "Fifth Settlement"),
    "north 90": ("Cairo", "New Cairo", "North 90 Street"),
    "north 90 street": ("Cairo", "New Cairo", "North 90 Street"),
    "maadi": ("Cairo", "Maadi", None),
    "degla": ("Cairo", "Maadi", "Degla"),
    "heliopolis": ("Cairo", "Heliopolis", None),
    "korba": ("Cairo", "Heliopolis", "Korba"),
    "giza": ("Giza", None, None),
    "sheikh zayed": ("Giza", "Sheikh Zayed", None),
    "zayed": ("Giza", "Sheikh Zayed", None),
    "6 october": ("Giza", "6 October", None),
    "october": ("Giza", "6 October", None),
    "beverly hills": ("Giza", "Sheikh Zayed", "Beverly Hills"),
    "sahel": ("North Coast", None, None),
    "north coast": ("North Coast", None, None),
    "الساحل": ("North Coast", None, None),
    "الساحل الشمالي": ("North Coast", None, None),
    "القاهرة": ("Cairo", None, None),
    "القاهرة الجديدة": ("Cairo", "New Cairo", None),
    "التجمع": ("Cairo", "New Cairo", None),
    "التجمع الخامس": ("Cairo", "New Cairo", "Fifth Settlement"),
    "المعادي": ("Cairo", "Maadi", None),
    "مصر الجديدة": ("Cairo", "Heliopolis", None),
    "الجيزة": ("Giza", None, None),
    "الشيخ زايد": ("Giza", "Sheikh Zayed", None),
    "اكتوبر": ("Giza", "6 October", None),
    "أكتوبر": ("Giza", "6 October", None),
}

AMENITY_ALIASES = {
    "parking": "Parking",
    "garage": "Parking",
    "pool": "Pool",
    "swimming pool": "Pool",
    "gym": "Gym",
    "elevator": "Elevator",
    "security": "Security",
    "garden": "Garden",
    "storage": "Storage",
    "balcony": "Balcony",
    "ac": "A/C",
    "a/c": "A/C",
}

GREETING_TOKENS = {"hi", "hello", "hey", "hola", "مرحبا", "اهلا", "أهلا", "السلام", "هاي"}


CONTEXT_FOLLOWUP_TOKENS = {
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
    "refine search",
}


def _normalize_compact_text(value: str) -> str:
    compact = re.sub(r"[^\w\u0600-\u06FF]+", " ", value.lower()).strip()
    return " ".join(compact.split())


def _looks_like_greeting(question: str) -> bool:
    compact = _normalize_compact_text(question)
    if compact in GREETING_TOKENS:
        return True

    english_token = compact.replace(" ", "")
    if re.fullmatch(r"hi+", english_token):
        return True
    if re.fullmatch(r"hey+", english_token):
        return True
    if re.fullmatch(r"hel+o+", english_token):
        return True

    return False


def _looks_like_context_followup(question: str) -> bool:
    return _normalize_compact_text(question) in CONTEXT_FOLLOWUP_TOKENS


def _should_keep_free_text_query(normalized: str, structured_keys: set[str]) -> bool:
    generic_only_keys = {
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
        "installmentMonthlyMax",
    }
    if structured_keys and structured_keys <= generic_only_keys:
        return False

    compact = _normalize_compact_text(normalized)
    generic_phrases = (
        "i want",
        "i need",
        "looking for",
        "find me",
        "show me",
        "search for",
    )
    return not any(compact.startswith(phrase) for phrase in generic_phrases)


def _parse_money(raw: str) -> float | None:
    cleaned = raw.lower().replace(",", "").replace("egp", "").replace("جنيه", "").strip()
    match = re.search(r"(\d+(?:\.\d+)?)\s*(m|million|mn|k|thousand)?", cleaned)
    if not match:
        return None
    value = float(match.group(1))
    unit = match.group(2)
    if unit in {"m", "million", "mn"}:
        return value * 1_000_000
    if unit in {"k", "thousand"}:
        return value * 1_000
    return value


def _contains_any(text: str, tokens: Iterable[str]) -> bool:
    return any(token in text for token in tokens)


def _match_alias(value: str, aliases: dict[str, str]) -> str | None:
    for key, canonical in aliases.items():
        if key in value:
            return canonical
    return None


def _collect_types(question: str) -> list[str] | None:
    matches: list[str] = []
    for canonical, words in PROPERTY_TYPE_ALIASES.items():
        if any(word in question for word in words):
            matches.append(canonical)
    return matches or None


def _collect_amenities(question: str) -> list[str] | None:
    amenities = [canonical for alias, canonical in AMENITY_ALIASES.items() if alias in question]
    unique = list(dict.fromkeys(amenities))
    return unique or None


def _detect_sort(question: str) -> str | None:
    if _contains_any(question, ["cheapest", "lowest price", "اقل سعر", "أقل سعر", "ارخص", "أرخص"]):
        return "PRICE_ASC"
    if _contains_any(question, ["most expensive", "highest price", "اغلى", "أغلى"]):
        return "PRICE_DESC"
    if _contains_any(question, ["largest", "biggest", "اكبر", "أكبر"]):
        return "AREA_DESC"
    if _contains_any(question, ["newest", "latest", "الأحدث", "الاحدث"]):
        return "NEWEST"
    return None


def _detect_range(question: str, patterns: Iterable[tuple[str, str]]) -> dict[str, float]:
    values: dict[str, float] = {}
    for key, pattern in patterns:
        match = re.search(pattern, question)
        if match:
            parsed = _parse_money(match.group(1))
            if parsed is not None:
                values[key] = parsed
    return values


def _apply_location_aliases(question: str, payload: dict[str, object]) -> None:
    for alias, location in sorted(LOCATION_ALIASES.items(), key=lambda item: len(item[0]), reverse=True):
        if alias in question:
            city, area, district = location
            if city:
                payload["city"] = city
            if area:
                payload["area"] = area
            if district:
                payload["district"] = district
            break


def _detect_transaction(question: str) -> str | None:
    if _contains_any(question, ["rent", "rental", "lease", "إيجار", "ايجار", "للإيجار", "للايجار"]):
        return "RENT"
    if _contains_any(question, ["vacation", "holiday", "summer", "مصيف", "ساحل", "اجازة", "إجازة"]):
        return "VACATION"
    if _contains_any(question, ["buy", "sale", "purchase", "own", "شراء", "للبيع"]):
        return "BUY"
    return None


def _apply_area_ranges(question: str, payload: dict[str, object]) -> None:
    area_max = re.search(r"(?:under|max|up to|less than|اقل من|أقل من)\s+(\d+(?:\.\d+)?)\s*(?:sqm|m2|sq m|متر)", question)
    if area_max:
        payload["maxArea"] = float(area_max.group(1))

    area_min = re.search(r"(?:from|min|starting at|more than|على الأقل|اقل مساحة|أقل مساحة)\s+(\d+(?:\.\d+)?)\s*(?:sqm|m2|sq m|متر)", question)
    if area_min:
        payload["minArea"] = float(area_min.group(1))


def _apply_room_counts(question: str, payload: dict[str, object]) -> None:
    beds_match = re.search(r"(\d+)\s*(?:bed|beds|bedroom|bedrooms|غرفة|غرف)", question)
    if beds_match:
        beds = int(beds_match.group(1))
        payload["minBeds"] = beds
        payload["maxBeds"] = beds

    baths_match = re.search(r"(\d+)\s*(?:bath|baths|bathroom|bathrooms|حمام|حمامين)", question)
    if baths_match:
        baths = int(baths_match.group(1))
        payload["minBaths"] = baths
        payload["maxBaths"] = baths


def _strip_greeting_only(question: str) -> bool:
    return _looks_like_greeting(question)


def extract_filters(message: str) -> ExtractFiltersResponse:
    normalized = " ".join(message.strip().split())
    question = normalized.lower()
    payload: dict[str, object] = {"page": 1, "pageSize": 10}
    warnings: list[str] = []

    if _strip_greeting_only(question):
        return ExtractFiltersResponse(normalized_query=normalized, filters=payload, warnings=["Greeting only."])

    if _looks_like_context_followup(question):
        return ExtractFiltersResponse(
            normalized_query=normalized,
            filters=payload,
            warnings=["Context follow-up only; reuse prior filters if available."],
        )

    transaction = _detect_transaction(question)
    if transaction:
        payload["transaction"] = transaction

    matched_types = _collect_types(question)
    if matched_types:
        payload["type"] = matched_types

    _apply_location_aliases(question, payload)

    project_name = _match_alias(question, PROJECT_ALIASES)
    if project_name and "projectName" not in payload:
        payload["projectName"] = project_name

    code_match = re.search(r"\b(?:unit|code)\s*([a-z0-9\-_/]+)\b", question, re.IGNORECASE)
    if code_match:
        payload["unitCode"] = code_match.group(1).upper()

    if _contains_any(question, ["garden", "حديقة"]):
        payload["hasGarden"] = True
    if _contains_any(question, ["roof", "روف"]):
        payload["hasRoof"] = True

    if _contains_any(question, ["installment", "installments", "تقسيط", "أقساط", "اقساط"]):
        payload["paymentType"] = "INSTALLMENTS"
    elif _contains_any(question, ["cash", "كاش", "نقد", "full payment"]):
        payload["paymentType"] = "CASH"

    if _contains_any(question, ["ready", "ready to move", "جاهز", "استلام فوري"]):
        payload["completionStatus"] = "READY"
    elif _contains_any(question, ["off plan", "under construction", "اوف بلان", "تحت الانشاء", "تحت الإنشاء"]):
        payload["completionStatus"] = "OFF_PLAN"

    if _contains_any(question, ["fully furnished", "furnished", "مفروش"]):
        payload["furnishing"] = "FULLY"
    elif _contains_any(question, ["semi furnished", "semi finished", "semi", "نصف تشطيب", "سيمي"]):
        payload["furnishing"] = "SEMI"
    elif _contains_any(question, ["unfurnished", "without furniture", "بدون فرش"]):
        payload["furnishing"] = "UNFURNISHED"

    amenities = _collect_amenities(question)
    if amenities:
        payload["amenities"] = amenities

    price_ranges = _detect_range(
        question,
        [
            ("maxPrice", r"(?:under|max|up to|budget|less than|اقل من|أقل من|بحد أقصى|بحد اقصى)\s+([0-9][0-9,.\s]*(?:m|million|mn|k|thousand)?)"),
            ("minPrice", r"(?:from|starting at|min|over|more than|من|ابتداء من)\s+([0-9][0-9,.\s]*(?:m|million|mn|k|thousand)?)"),
        ],
    )
    payload.update(price_ranges)

    _apply_area_ranges(question, payload)
    _apply_room_counts(question, payload)

    down_payment = re.search(
        r"(?:down payment|dp|مقدم)(?: max)?\s+([0-9][0-9,.\s]*(?:m|million|mn|k|thousand)?)", question
    )
    if down_payment:
        parsed = _parse_money(down_payment.group(1))
        if parsed is not None:
            payload["downPaymentMax"] = parsed

    installment_years = re.search(r"(\d+)\s*(?:year|years|سنة|سنين)", question)
    if installment_years and payload.get("paymentType") == "INSTALLMENTS":
        payload["installmentYearsMax"] = float(installment_years.group(1))

    payload["sort"] = _detect_sort(question) or "FEATURED"

    structured_keys = set(payload.keys()) - {"page", "pageSize", "sort"}
    if not structured_keys:
        payload["q"] = normalized
    elif "unitCode" in structured_keys:
        payload.pop("q", None)
    elif (
        len(normalized.split()) >= 4
        and not {"city", "area", "district", "projectName"} & structured_keys
        and _should_keep_free_text_query(normalized, structured_keys)
    ):
        payload["q"] = normalized

    if len(structured_keys) <= 1:
        warnings.append("Limited structured filters were detected, so the assistant may need clarification.")

    validated = AiPropertyFilters(**payload)
    return ExtractFiltersResponse(
        normalized_query=normalized,
        filters=validated.to_payload(),
        warnings=warnings,
    )
