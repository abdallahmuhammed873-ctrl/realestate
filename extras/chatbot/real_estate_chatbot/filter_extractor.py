from __future__ import annotations

import re
from typing import Iterable

from service_contract import AiPropertyFilters, ExtractFiltersResponse

PROPERTY_TYPE_ALIASES = {
    "APARTMENT": ["apartment", "flat"],
    "VILLA": ["villa", "standalone villa", "stand alone villa"],
    "DUPLEX": ["duplex"],
    "PENTHOUSE": ["penthouse"],
    "CHALET": ["chalet"],
    "LAND": ["land", "plot"],
    "COMMERCIAL": ["commercial", "office", "retail", "clinic"],
}

PROJECT_ALIASES = {
    "aliva": "Aliva",
    "lvls": "LVLS",
    "new cairo": "New Cairo",
    "sheikh zayed": "Sheikh Zayed",
    "zayed": "Sheikh Zayed",
    "6 october": "6 October",
    "october": "6 October",
}

AREA_ALIASES = {
    "new cairo": ("New Cairo", None, None),
    "sheikh zayed": ("Giza", "Sheikh Zayed", None),
    "zayed": ("Giza", "Sheikh Zayed", None),
    "6 october": ("Giza", "6 October", None),
    "october": ("Giza", "6 October", None),
}


def _parse_money(raw: str) -> float | None:
    cleaned = raw.lower().replace(",", "").strip()
    match = re.search(r"(\d+(?:\.\d+)?)\s*(m|million|k|thousand)?", cleaned)
    if not match:
        return None
    value = float(match.group(1))
    unit = match.group(2)
    if unit in {"m", "million"}:
        return value * 1_000_000
    if unit in {"k", "thousand"}:
        return value * 1_000
    return value


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


def _detect_sort(question: str) -> str | None:
    if "cheapest" in question or "lowest price" in question:
        return "PRICE_ASC"
    if "most expensive" in question or "highest price" in question:
        return "PRICE_DESC"
    if "largest" in question or "biggest" in question:
        return "AREA_DESC"
    if "newest" in question or "latest" in question:
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


def extract_filters(message: str) -> ExtractFiltersResponse:
    normalized = " ".join(message.strip().split())
    question = normalized.lower()
    payload: dict[str, object] = {"q": normalized, "page": 1, "pageSize": 10}
    warnings: list[str] = []

    if "rent" in question or "rental" in question:
        payload["transaction"] = "RENT"
    elif "buy" in question or "sale" in question or "purchase" in question:
        payload["transaction"] = "BUY"

    matched_types = _collect_types(question)
    if matched_types:
        payload["type"] = matched_types

    for alias, location in AREA_ALIASES.items():
        if alias in question:
            city, area, district = location
            if city:
                payload["city"] = city
            if area:
                payload["area"] = area
            if district:
                payload["district"] = district
            break

    project_name = _match_alias(question, PROJECT_ALIASES)
    if project_name:
        payload["projectName"] = project_name

    code_match = re.search(r"\bunit\s*([a-z0-9\-_/]+)\b", question, re.IGNORECASE)
    if code_match:
        payload["unitCode"] = code_match.group(1).upper()

    if "garden" in question:
        payload["hasGarden"] = True
    if "roof" in question:
        payload["hasRoof"] = True

    if "installment" in question:
        payload["paymentType"] = "INSTALLMENTS"
    elif "cash" in question:
        payload["paymentType"] = "CASH"

    if "ready" in question or "ready to move" in question:
        payload["completionStatus"] = "READY"
    elif "off plan" in question:
        payload["completionStatus"] = "OFF_PLAN"

    price_ranges = _detect_range(
        question,
        [
            ("maxPrice", r"(?:under|max|up to|budget)\s+([0-9][0-9,.\s]*(?:m|million|k|thousand)?)"),
            ("minPrice", r"(?:from|starting at|min)\s+([0-9][0-9,.\s]*(?:m|million|k|thousand)?)"),
        ],
    )
    payload.update(price_ranges)

    area_max = re.search(r"(?:under|max|up to)\s+(\d+(?:\.\d+)?)\s*(?:sqm|m2|sq m)", question)
    if area_max:
        payload["maxArea"] = float(area_max.group(1))

    beds_match = re.search(r"(\d+)\s*bed", question)
    if beds_match:
        beds = int(beds_match.group(1))
        payload["minBeds"] = beds
        payload["maxBeds"] = beds

    baths_match = re.search(r"(\d+)\s*bath", question)
    if baths_match:
        baths = int(baths_match.group(1))
        payload["minBaths"] = baths
        payload["maxBaths"] = baths

    down_payment = re.search(r"down payment(?: max)?\s+([0-9][0-9,.\s]*(?:m|million|k|thousand)?)", question)
    if down_payment:
        parsed = _parse_money(down_payment.group(1))
        if parsed is not None:
            payload["downPaymentMax"] = parsed

    installment_years = re.search(r"(\d+)\s*(?:year|years)", question)
    if installment_years and "installment" in question:
        payload["installmentYearsMax"] = float(installment_years.group(1))

    payload["sort"] = _detect_sort(question) or "FEATURED"

    if len(payload) <= 3:
        warnings.append("No strong structured filters were detected, so broad search text will be used.")

    validated = AiPropertyFilters(**payload)
    return ExtractFiltersResponse(
        normalized_query=normalized,
        filters=validated.to_payload(),
        warnings=warnings,
    )
