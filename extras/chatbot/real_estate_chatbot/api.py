from __future__ import annotations

import logging
import traceback
from copy import deepcopy

from fastapi import FastAPI, HTTPException, Request

from filter_extractor import extract_filters
from platform_client import PlatformClient
from scripts.llm_engine import AgentToolbox, build_llm_provider
from service_contract import AiPropertyFilters, ChatRequest, ChatResponse, ExtractFiltersResponse, HealthResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(title="Unified Real Estate AI Service", version="1.0.0")
platform_client = PlatformClient()
llm_provider = build_llm_provider()
logger = logging.getLogger("real_estate_ai.api")

GREETING_WORDS = {"hi", "hello", "hey", "مرحبا", "اهلا", "أهلا", "السلام", "هاي"}


def _normalize_compact_text(value: str) -> str:
    compact = "".join(ch if ch.isalnum() or ch.isspace() else " " for ch in value.lower()).strip()
    return " ".join(compact.split())


def _looks_like_greeting(message: str) -> bool:
    compact = _normalize_compact_text(message)
    if compact in GREETING_WORDS:
        return True

    english_token = compact.replace(" ", "")
    if english_token.startswith("hi") and set(english_token) <= {"h", "i"}:
        return True
    if english_token.startswith("hey") and set(english_token) <= {"h", "e", "y"}:
        return True
    if english_token.startswith("hel") and "o" in english_token and set(english_token) <= {"h", "e", "l", "o"}:
        return True

    return False


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
    return _looks_like_greeting(message)


def _merge_filters(base: dict, extra: dict) -> dict:
    merged = deepcopy(base)
    base_has_specific_search = any(
        key in merged
        for key in (
            "transaction",
            "type",
            "city",
            "area",
            "district",
            "projectName",
            "unitCode",
            "minPrice",
            "maxPrice",
        )
    )
    for key, value in extra.items():
        if key in {"page", "pageSize", "sort"}:
            merged[key] = value
            continue
        if key == "q" and base_has_specific_search:
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


def _relax_filters(filters: dict) -> tuple[dict, list[str]]:
    relaxed = deepcopy(filters)
    relaxed_keys: list[str] = []

    def drop(key: str) -> None:
        if key in relaxed:
            relaxed.pop(key, None)
            relaxed_keys.append(key)

    if "projectName" in relaxed:
        drop("projectName")
    elif "district" in relaxed:
        drop("district")
    elif "area" in relaxed and "city" in relaxed:
        drop("area")
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
    elif "transaction" in relaxed:
        drop("transaction")

    return relaxed, relaxed_keys


def _search(filters: dict, trace_id: str | None = None) -> tuple[dict, list[dict]]:
    validated_filters = AiPropertyFilters(**filters)
    payload = validated_filters.to_payload()
    logger.info("[AI Chat][%s] search request filters=%s", trace_id or "-", payload)
    search_result = platform_client.search_properties(payload, trace_id=trace_id)
    items = _to_grounded_items(search_result.get("items", []))
    logger.info(
        "[AI Chat][%s] search result total=%s returned=%s item_ids=%s",
        trace_id or "-",
        search_result.get("total"),
        len(items),
        [item.get("id") for item in items[:5]],
    )
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
def chat(request: ChatRequest, raw_request: Request) -> ChatResponse:
    trace_id = raw_request.headers.get("x-chat-trace-id", f"py-chat-{id(request)}")
    logger.info(
        "[AI Chat][%s] incoming /chat message=%r language=%s history_count=%s",
        trace_id,
        request.message,
        request.language,
        len(request.history),
    )

    prior_filters = _history_filters(request)
    logger.info("[AI Chat][%s] prior_filters=%s", trace_id, prior_filters)

    try:
        outcome = llm_provider.assist(
            AgentToolbox(
                language=request.language,
                trace_id=trace_id,
                user_message=request.message,
                history=[{"role": item.role, "content": item.content} for item in request.history],
                prior_filters=prior_filters,
                extract_filters=extract_filters,
                merge_filters=_merge_filters,
                search=lambda filters: _search(filters, trace_id=trace_id),
                relax_filters=_relax_filters,
                suggested_filters=_build_suggested_filters,
                is_greeting=_is_greeting,
            )
        )
    except Exception as exc:
        logger.exception("[AI Chat][%s] /chat failed: %s", trace_id, exc)
        logger.debug("[AI Chat][%s] traceback\n%s", trace_id, traceback.format_exc())
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    logger.info(
        "[AI Chat][%s] success intent=%s should_search=%s total=%s suggestions=%s extracted_filters=%s",
        trace_id,
        outcome.intent,
        outcome.should_search,
        outcome.total,
        len(outcome.suggestions),
        outcome.extracted_filters,
    )

    return ChatResponse(
        reply=outcome.reply,
        language=request.language,
        intent=outcome.intent,
        shouldSearch=outcome.should_search,
        clarifyingQuestion=outcome.clarifying_question,
        suggestions=outcome.suggestions,
        suggestedFilters=outcome.suggested_filters,
        extractedFilters=outcome.extracted_filters,
        relaxedFilters=outcome.relaxed_filters,
        total=outcome.total,
        items=outcome.items,
    )
