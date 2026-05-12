from __future__ import annotations

from fastapi import FastAPI, HTTPException

from filter_extractor import extract_filters
from platform_client import PlatformClient
from scripts.llm_engine import build_llm_provider
from service_contract import AiPropertyFilters, ChatRequest, ChatResponse, ExtractFiltersResponse, HealthResponse

app = FastAPI(title="Unified Real Estate AI Service", version="1.0.0")
platform_client = PlatformClient()
llm_provider = build_llm_provider()


def _build_suggested_filters(filters: dict) -> list[str]:
    ordered = [
        "transaction",
        "projectName",
        "city",
        "area",
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
    for item in items[:10]:
        grounded.append(
            {
                "id": item.get("id"),
                "title": item.get("title"),
                "projectName": item.get("projectName"),
                "transaction": item.get("transaction"),
                "type": item.get("type"),
                "price": item.get("price"),
                "rentPrice": item.get("rentPrice"),
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
            }
        )
    return grounded


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

    try:
        validated_filters = AiPropertyFilters(**extraction.filters)
        search_result = platform_client.search_properties(validated_filters.to_payload())
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    items = search_result.get("items", [])
    grounded_items = _to_grounded_items(items)
    if not grounded_items:
        reply = (
            "لم أجد عقارات مطابقة في بيانات المنصة المشتركة. جرّب تعديل الميزانية أو المنطقة أو نوع العقار."
            if request.language == "AR"
            else "I could not find matching properties in the shared platform data. Try adjusting the budget, location, or property type."
        )
    else:
        reply = llm_provider.answer(
            language=request.language,
            user_question=request.message,
            filters=validated_filters.to_payload(),
            properties=grounded_items,
        )

    return ChatResponse(
        reply=reply,
        language=request.language,
        suggestedFilters=_build_suggested_filters(validated_filters.to_payload()),
        extractedFilters=validated_filters.to_payload(),
        total=int(search_result.get("total", 0)),
        items=grounded_items,
    )
