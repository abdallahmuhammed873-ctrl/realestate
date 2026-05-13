from __future__ import annotations

from copy import deepcopy

from fastapi import FastAPI, HTTPException

from filter_extractor import extract_filters
from platform_client import PlatformClient
from scripts.llm_engine import build_llm_provider
from service_contract import AiPropertyFilters, ChatRequest, ChatResponse, ExtractFiltersResponse, HealthResponse

app = FastAPI(title="Unified Real Estate AI Service", version="1.0.0")
platform_client = PlatformClient()
llm_provider = build_llm_provider()

GREETING_WORDS = {"hi", "hello", "hey", "مرحبا", "اهلا", "أهلا", "السلام", "هاي"}
CORE_FILTER_KEYS = {
    "transaction",
    "type",
    "city",
    "area",
    "district",
    "projectName",
    "unitCode",
    "minPrice",
    "maxPrice",
    "paymentType",
    "completionStatus",
    "minBeds",
    "maxBeds",
}


def _build_suggested_filters(filters: dict) -> list[str]:
    ordered = [
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
        "hasRoof",
    ]
    return [key for key in ordered if key in filters]


def _to_grounded_items(items: list[dict]) -> list[dict]:
    grounded = []
    for item in items[:6]:
        grounded.append(
            {
                "id": item.get("id"),
                "title": item.get("title"),
                "projectName": item.get("projectName"),
                "transaction": item.get("transaction"),
                "type": item.get("type"),
                "price": item.get("price"),
                "rentPrice": item.get("rentPrice"),
                "currency": item.get("currency"),
                "areaSqm": item.get("areaSqm"),
                "bedrooms": item.get("bedrooms"),
                "bathrooms": item.get("bathrooms"),
                "city": item.get("city"),
                "area": item.get("area"),
                "district": item.get("district"),
                "inventoryStatus": item.get("inventoryStatus"),
                "unitCode": item.get("unitCode"),
                "paymentType": item.get("paymentType"),
                "completionStatus": item.get("completionStatus"),
                "hasGarden": item.get("hasGarden"),
                "hasRoof": item.get("hasRoof"),
                "images": item.get("images") or [],
                "listedByName": item.get("listedByName"),
                "listedByCompanyName": item.get("listedByCompanyName"),
                "verified": bool(item.get("verified")),
            }
        )
    return grounded


def _is_greeting(message: str) -> bool:
    compact = "".join(ch if ch.isalnum() or ch.isspace() else " " for ch in message.lower()).strip()
    return compact in GREETING_WORDS


def _conversation_summary(language: str, filters: dict) -> str | None:
    parts: list[str] = []
    transaction = filters.get("transaction")
    if transaction == "BUY":
        parts.append("buy" if language == "EN" else "شراء")
    elif transaction == "RENT":
        parts.append("rent" if language == "EN" else "إيجار")
    elif transaction == "VACATION":
        parts.append("vacation" if language == "EN" else "مصيف")

    property_types = filters.get("type")
    if isinstance(property_types, list) and property_types:
        parts.append(", ".join(property_types).lower())

    location = next((filters.get(key) for key in ("district", "area", "city", "projectName") if filters.get(key)), None)
    if location:
        parts.append(f"in {location}" if language == "EN" else f"في {location}")

    if "maxPrice" in filters:
        budget = f"under EGP {int(filters['maxPrice']):,}"
        parts.append(budget if language == "EN" else f"بميزانية حتى {int(filters['maxPrice']):,} جنيه")

    if not parts:
        return None

    if language == "AR":
        return "أفهم أنك تبحث عن " + " ".join(parts) + "."
    return "I understand you're looking to " + " ".join(parts) + "."


def _merge_filters(base: dict, extra: dict) -> dict:
    merged = deepcopy(base)
    for key, value in extra.items():
        if key in {"page", "pageSize", "sort"}:
            merged[key] = value
            continue
        if key not in merged or merged.get(key) in (None, "", []):
            merged[key] = value
    return merged


def _history_filters(request: ChatRequest) -> dict:
    merged: dict = {}
    for item in request.history[-6:]:
        if item.role != "user":
            continue
        extracted = extract_filters(item.content).filters
        merged = _merge_filters(merged, extracted)
    return merged


def _needs_clarification(message: str, filters: dict) -> bool:
    if _is_greeting(message):
        return True
    strong_keys = CORE_FILTER_KEYS & set(filters.keys())
    if "unitCode" in filters:
        return False
    if len(strong_keys) >= 2:
        return False
    if any(key in filters for key in ("city", "area", "district", "projectName")) and any(
        key in filters for key in ("transaction", "type", "minPrice", "maxPrice")
    ):
        return False
    return len(strong_keys) == 0


def _clarifying_question(language: str, filters: dict) -> str:
    if not any(key in filters for key in ("transaction",)):
        return (
            "Are you looking to buy, rent, or vacation?"
            if language == "EN"
            else "هل تبحث عن شراء أم إيجار أم مصيف؟"
        )
    if not any(key in filters for key in ("city", "area", "district", "projectName")):
        return (
            "Which city or area should I focus on?"
            if language == "EN"
            else "ما المدينة أو المنطقة التي تريدني أن أركز عليها؟"
        )
    return (
        "Do you have a budget range or preferred property type?"
        if language == "EN"
        else "هل لديك ميزانية محددة أو نوع عقار مفضل؟"
    )


def _default_suggestions(language: str, filters: dict | None = None) -> list[str]:
    filters = filters or {}
    location = filters.get("area") or filters.get("city") or "New Cairo"
    if language == "AR":
        return [
            f"شقق للبيع في {location}",
            f"فلل للإيجار في {location}",
            "تقسيط ومقدم منخفض",
        ]
    return [
        f"Buy apartments in {location}",
        f"Rent villas in {location}",
        "Installments with low down payment",
    ]


def _compare_suggestions(language: str, items: list[dict]) -> list[str]:
    if len(items) >= 2:
        left = items[0].get("title") or items[0].get("projectName") or "first result"
        right = items[1].get("title") or items[1].get("projectName") or "second result"
        if language == "AR":
            return [f"قارن بين {left} و {right}", "رتّب حسب أقل سعر", "اعرض فقط الشقق"]
        return [f"Compare {left} vs {right}", "Sort by lowest price", "Show apartments only"]
    return _default_suggestions(language)


def _relax_filters(filters: dict) -> tuple[dict, list[str]]:
    relaxed = deepcopy(filters)
    relaxed_keys: list[str] = []

    def drop(key: str) -> None:
        if key in relaxed:
            relaxed.pop(key, None)
            relaxed_keys.append(key)

    if "district" in relaxed:
        drop("district")
    elif "maxPrice" in relaxed and isinstance(relaxed["maxPrice"], (int, float)):
        relaxed["maxPrice"] = float(relaxed["maxPrice"]) * 1.2
        relaxed_keys.append("maxPrice")
    elif "type" in relaxed:
        drop("type")
    elif "paymentType" in relaxed:
        drop("paymentType")
    elif "minBeds" in relaxed or "maxBeds" in relaxed:
        drop("minBeds")
        drop("maxBeds")

    return relaxed, relaxed_keys


def _search(filters: dict) -> tuple[dict, list[dict]]:
    validated_filters = AiPropertyFilters(**filters)
    search_result = platform_client.search_properties(validated_filters.to_payload())
    items = _to_grounded_items(search_result.get("items", []))
    return search_result, items


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    reachable = platform_client.get_health()
    return HealthResponse(
        status="ok" if reachable else "degraded",
        llmProvider=llm_provider.provider_name,
        platformBaseUrl=platform_client.base_url,
        platformReachable=reachable,
    )


@app.post("/extract-filters", response_model=ExtractFiltersResponse)
def extract_filters_endpoint(request: ChatRequest) -> ExtractFiltersResponse:
    return extract_filters(request.message)


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    extraction = extract_filters(request.message)
    history_filters = _history_filters(request)
    merged_filters = _merge_filters(extraction.filters, history_filters)

    try:
        validated_filters = AiPropertyFilters(**merged_filters)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    filters_payload = validated_filters.to_payload()
    if _needs_clarification(request.message, filters_payload):
        clarifying_question = _clarifying_question(request.language, filters_payload)
        greeting_reply = (
            "I can help you search, compare, and refine properties step by step."
            if request.language == "EN"
            else "أقدر أساعدك في البحث عن العقارات ومقارنتها وتضييق النتائج خطوة بخطوة."
        )
        reply = f"{greeting_reply}\n{clarifying_question}"
        return ChatResponse(
            reply=reply,
            language=request.language,
            intent="CLARIFY" if not _is_greeting(request.message) else "GREETING",
            shouldSearch=False,
            clarifyingQuestion=clarifying_question,
            suggestions=_default_suggestions(request.language, filters_payload),
            suggestedFilters=_build_suggested_filters(filters_payload),
            extractedFilters=filters_payload,
        )

    try:
        search_result, grounded_items = _search(filters_payload)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    relaxed_filters: list[str] = []
    result_total = int(search_result.get("total", 0))
    if not grounded_items:
        relaxed_payload, relaxed_filters = _relax_filters(filters_payload)
        if relaxed_filters:
            try:
                search_result, grounded_items = _search(relaxed_payload)
                result_total = int(search_result.get("total", 0))
                filters_payload = AiPropertyFilters(**relaxed_payload).to_payload()
            except Exception:
                grounded_items = []

    conversation_summary = _conversation_summary(request.language, filters_payload)

    if not grounded_items:
        clarifying_question = _clarifying_question(request.language, filters_payload)
        reply = (
            "I could not find a direct match yet. I can broaden the search or refine it with one more detail."
            if request.language == "EN"
            else "لم أجد تطابقًا مباشرًا بعد. يمكنني توسيع البحث أو تضييقه إذا أعطيتني تفصيلة إضافية."
        )
        return ChatResponse(
            reply=f"{reply}\n{clarifying_question}",
            language=request.language,
            intent="NO_RESULTS",
            shouldSearch=True,
            clarifyingQuestion=clarifying_question,
            suggestions=_default_suggestions(request.language, filters_payload),
            suggestedFilters=_build_suggested_filters(filters_payload),
            extractedFilters=filters_payload,
            relaxedFilters=relaxed_filters,
            total=0,
            items=[],
        )

    intent = "COMPARE" if "compare" in request.message.lower() else "SEARCH_RESULTS"
    reply = llm_provider.answer(
        language=request.language,
        user_question=request.message,
        filters=filters_payload,
        properties=grounded_items,
        result_total=result_total,
        relaxed_filters=relaxed_filters,
        conversation_summary=conversation_summary,
    )

    return ChatResponse(
        reply=reply,
        language=request.language,
        intent=intent,
        shouldSearch=True,
        clarifyingQuestion=None,
        suggestions=_compare_suggestions(request.language, grounded_items),
        suggestedFilters=_build_suggested_filters(filters_payload),
        extractedFilters=filters_payload,
        relaxedFilters=relaxed_filters,
        total=result_total,
        items=grounded_items,
    )
