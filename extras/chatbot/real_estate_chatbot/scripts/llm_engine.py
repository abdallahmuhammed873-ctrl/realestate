from __future__ import annotations

import json
import logging
import os
import ast
from dataclasses import dataclass, field
from typing import Any, Callable

try:
    import ollama  # type: ignore
except Exception:  # pragma: no cover - optional dependency at runtime
    ollama = None


logger = logging.getLogger("real_estate_ai.llm")


AGENT_SYSTEM_PROMPT = """
You are a grounded, interactive real estate assistant running in an agent loop with tools.

Core behavior:
- You write the customer-facing answer. Do not rely on canned wording.
- Use tools before you answer whenever you need structured filters, search results, relaxed filters, or clarification context.
- For any property-search request, first call extract_filters_from_text, then call search_properties when there is enough searchable context.
- If the user only greets you, greet them warmly like a real estate customer-support assistant, briefly say you can help search, compare, explain prices/payment plans, and ask one easy question to start.
- If the user gives a short follow-up like "yes", "okay", "more details", "show me more details", or "show more", continue from the known search context instead of resetting the conversation or treating those words as a search keyword.
- If the request is too vague, call build_clarification and then answer naturally.
- If a search returns no items, call relax_search_filters and then search_properties again.
- If relaxed results are returned, be honest that they are broadened alternatives and name which constraint changed.
- Never invent prices, projects, locations, availability, or payment plans.
- Never convert currencies, estimate exchange rates, or add approximate values unless that exact value came from a tool result.
- Never ask for unsupported distinctions such as short-term vs long-term rent unless the user explicitly asked for that and the platform data supports it.
- Never offer unsupported actions such as scheduling a viewing.
- Base your final answer only on tool results and prior conversation context.
- Always answer in the requested language. If language is EN, write natural English only. If language is AR, write the user-facing reply and suggestions in Arabic script even if the user typed English.
- For English greetings, start naturally with "Hi" or "Hello", not Arabic words.
- For Arabic, use simple clear Modern Standard Arabic. Keep unit codes, property titles, project names, and place names exactly as shown by tools when they are proper nouns.
- Be concise, practical, and conversational.

Response style:
- If you have results, summarize what the user wants and highlight the best matches.
- If the user wants help or gives an acknowledgement like "okay", guide them with one practical next step.
- If the user greets you, do not jump straight into a form-like question; sound welcoming and helpful first.
- If there are no results even after broadening, explain that clearly and ask for one useful refinement.
""".strip()


@dataclass
class AgentToolbox:
    language: str
    trace_id: str
    user_message: str
    history: list[dict[str, str]]
    prior_filters: dict[str, Any]
    extract_filters: Callable[[str], Any]
    merge_filters: Callable[[dict, dict], dict]
    search: Callable[[dict], tuple[dict, list[dict]]]
    relax_filters: Callable[[dict], tuple[dict, list[str]]]
    suggested_filters: Callable[[dict], list[str]]
    is_greeting: Callable[[str], bool]


@dataclass
class AgentOutcome:
    reply: str
    intent: str = "GUIDANCE"
    should_search: bool = False
    clarifying_question: str | None = None
    suggestions: list[str] = field(default_factory=list)
    suggested_filters: list[str] = field(default_factory=list)
    extracted_filters: dict[str, Any] = field(default_factory=dict)
    relaxed_filters: list[str] = field(default_factory=list)
    total: int = 0
    items: list[dict[str, Any]] = field(default_factory=list)


FINAL_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "reply": {"type": "string"},
        "intent": {
            "type": "string",
            "enum": ["GREETING", "CLARIFY", "SEARCH_RESULTS", "NO_RESULTS", "COMPARE", "GUIDANCE"],
        },
        "clarifying_question": {"type": ["string", "null"]},
        "suggestions": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["reply", "intent", "clarifying_question", "suggestions"],
    "additionalProperties": False,
}


def _as_message_dict(message: Any) -> dict[str, Any]:
    if isinstance(message, dict):
        return message
    if hasattr(message, "model_dump"):
        return message.model_dump()
    result: dict[str, Any] = {}
    for key in ("role", "content", "tool_calls", "thinking"):
        value = getattr(message, key, None)
        if value is not None:
            result[key] = value
    return result


def _tool_calls_from_message(message: dict[str, Any]) -> list[dict[str, Any]]:
    tool_calls = message.get("tool_calls")
    if not isinstance(tool_calls, list):
        return []
    normalized: list[dict[str, Any]] = []
    for call in tool_calls:
        if isinstance(call, dict):
            normalized.append(call)
        elif hasattr(call, "model_dump"):
            normalized.append(call.model_dump())
    return normalized


def _normalize_tool_arguments(arguments: Any) -> dict[str, Any]:
    if isinstance(arguments, dict):
        return arguments
    if isinstance(arguments, str):
        try:
            parsed = json.loads(arguments)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _coerce_filters_arg(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed_json = json.loads(value)
            if isinstance(parsed_json, dict):
                return parsed_json
        except Exception:
            pass
        try:
            parsed_literal = ast.literal_eval(value)
            if isinstance(parsed_literal, dict):
                return parsed_literal
        except Exception:
            pass
    return {}


def _dedupe_strings(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))


def _safe_json_object(raw: str) -> dict[str, Any]:
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _json_text(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def _items_for_llm(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    visible_keys = (
        "id",
        "title",
        "projectName",
        "transaction",
        "type",
        "price",
        "rentPrice",
        "currency",
        "areaSqm",
        "bedrooms",
        "bathrooms",
        "city",
        "area",
        "district",
        "inventoryStatus",
        "unitCode",
        "paymentType",
        "completionStatus",
        "hasGarden",
        "hasRoof",
        "listedByName",
        "listedByCompanyName",
        "verified",
    )
    return [{key: item.get(key) for key in visible_keys if item.get(key) is not None} for item in items[:6]]


def _contains_arabic(value: str) -> bool:
    return any("\u0600" <= ch <= "\u06FF" for ch in value)


def _contains_mojibake(value: str) -> bool:
    return any(marker in value for marker in ("Ø", "Ù", "Û", "�"))


def _matches_requested_language(reply: str, suggestions: list[Any], language: str) -> bool:
    combined = " ".join([reply, *[item for item in suggestions if isinstance(item, str)]])
    if _contains_mojibake(combined):
        return False

    if language == "AR":
        return _contains_arabic(combined)

    lowered = combined.lower()
    return not _contains_arabic(combined) and "marhaba" not in lowered


def _mentions_relaxed_result(reply: str, relaxed_filters: list[str], language: str) -> bool:
    if not relaxed_filters:
        return True

    lowered = reply.lower()
    if "matches your search" in lowered or "exact match" in lowered:
        return False

    if language == "AR":
        return any(token in reply for token in ("بديل", "بدائل", "وسعت", "توسيع", "الأقرب", "قريبة"))

    return any(
        token in lowered
        for token in (
            "alternative",
            "broaden",
            "widen",
            "relax",
            "closest",
            "instead",
            "no exact",
            "not exact",
            "changed",
            "different",
        )
    )


def _mentions_returned_item_details(reply: str, items: list[dict[str, Any]]) -> bool:
    if not items:
        return True

    first_item = items[0]
    title = str(first_item.get("title") or first_item.get("projectName") or "").strip()
    if title and _normalized_text(title) not in _normalized_text(reply):
        return False

    price = first_item.get("rentPrice") if first_item.get("transaction") == "RENT" else first_item.get("price")
    if price is not None:
        price_digits = "".join(ch for ch in str(int(price)) if ch.isdigit())
        reply_digits = "".join(ch for ch in reply if ch.isdigit())
        if price_digits and price_digits not in reply_digits:
            return False

    currency = str(first_item.get("currency") or "").strip()
    if currency and currency.lower() not in reply.lower():
        return False

    return True


def _has_meaningful_filters(filters: dict[str, Any]) -> bool:
    return any(key not in {"page", "pageSize", "sort"} for key in filters)


def _sanitize_suggestions(values: list[Any]) -> list[str]:
    cleaned: list[str] = []
    for value in values:
        if not isinstance(value, str):
            continue
        suggestion = " ".join(value.strip().split())
        if not suggestion:
            continue
        suggestion = suggestion.lstrip("•-⚕⚠")
        suggestion = suggestion.lstrip("-* ")
        if "_" in suggestion:
            continue
        lowered = suggestion.lower()
        if lowered in {"house", "condo", "townhouse"}:
            continue
        if "schedule a viewing" in lowered:
            continue
        cleaned.append(suggestion)
    return _dedupe_strings(cleaned)[:3]


def _normalized_text(value: str) -> str:
    return " ".join("".join(ch if ch.isalnum() or ch.isspace() else " " for ch in value.lower()).split())


def _is_acknowledgement_like(message: str) -> bool:
    return _normalized_text(message) in {"ok", "okay", "okey", "yes", "sure", "fine", "go ahead", "continue"}


def _is_more_details_like(message: str) -> bool:
    return _normalized_text(message) in {
        "more details",
        "details",
        "show more",
        "show me more",
        "show me more details",
        "show details",
        "tell me more",
        "more info",
        "compare them",
        "show similar",
        "show similar properties",
        "refine search",
    }


def _is_context_followup_like(message: str) -> bool:
    return _is_acknowledgement_like(message) or _is_more_details_like(message)


def _should_force_grounded_search(filters: dict[str, Any]) -> bool:
    if not _has_meaningful_filters(filters):
        return False
    if any(key in filters for key in ("unitCode", "projectName")):
        return True
    has_location = any(key in filters for key in ("city", "area", "district"))
    has_transaction = "transaction" in filters
    has_budget = any(key in filters for key in ("minPrice", "maxPrice", "downPaymentMax", "installmentMonthlyMax"))
    has_type = "type" in filters
    has_free_text = "q" in filters
    return has_free_text or (has_transaction and (has_location or has_budget or has_type)) or (has_location and (has_type or has_budget))


def _is_searchable_filter_set(filters: dict[str, Any]) -> bool:
    if not _has_meaningful_filters(filters):
        return False
    return any(
        key in filters
        for key in (
            "q",
            "unitCode",
            "projectName",
            "city",
            "area",
            "district",
            "transaction",
            "type",
            "minPrice",
            "maxPrice",
        )
    )


def _format_filter_summary(filters: dict[str, Any]) -> str:
    parts: list[str] = []
    transaction = filters.get("transaction")
    if transaction == "BUY":
        parts.append("to buy")
    elif transaction == "RENT":
        parts.append("to rent")
    elif transaction == "VACATION":
        parts.append("for vacation")

    property_types = filters.get("type")
    if isinstance(property_types, list) and property_types:
        parts.append(", ".join(str(item).lower() for item in property_types))

    location = next((filters.get(key) for key in ("district", "area", "city", "projectName") if filters.get(key)), None)
    if location:
        parts.append(f"in {location}")

    if isinstance(filters.get("maxPrice"), (int, float)):
        parts.append(f"under EGP {int(filters['maxPrice']):,}")

    return " ".join(parts).strip()


def _tool_schemas() -> list[dict[str, Any]]:
    filter_object_schema = {
        "type": "object",
        "description": "Search filters for the real estate platform",
        "additionalProperties": False,
        "properties": {
            "q": {"type": "string", "description": "Free-text keyword only when the user gives a real project, address, or unit keyword."},
            "transaction": {"type": "string", "enum": ["BUY", "RENT", "VACATION"]},
            "type": {
                "type": "array",
                "items": {"type": "string", "enum": ["APARTMENT", "VILLA", "DUPLEX", "PENTHOUSE", "CHALET", "LAND", "COMMERCIAL"]},
            },
            "city": {"type": "string"},
            "area": {"type": "string"},
            "district": {"type": "string"},
            "projectName": {"type": "string"},
            "minPrice": {"type": "number"},
            "maxPrice": {"type": "number"},
            "minArea": {"type": "number"},
            "maxArea": {"type": "number"},
            "minBeds": {"type": "integer"},
            "maxBeds": {"type": "integer"},
            "minBaths": {"type": "integer"},
            "maxBaths": {"type": "integer"},
            "paymentType": {"type": "string", "enum": ["CASH", "INSTALLMENTS"]},
            "furnishing": {"type": "string", "enum": ["FULLY", "SEMI", "UNFURNISHED"]},
            "completionStatus": {"type": "string", "enum": ["OFF_PLAN", "READY"]},
            "hasGarden": {"type": "boolean"},
            "hasRoof": {"type": "boolean"},
            "amenities": {"type": "array", "items": {"type": "string"}},
            "downPaymentMax": {"type": "number"},
            "installmentYearsMax": {"type": "number"},
            "installmentMonthlyMax": {"type": "number"},
            "unitCode": {"type": "string"},
            "inventoryStatus": {"type": "string"},
            "sort": {"type": "string", "enum": ["FEATURED", "NEWEST", "PRICE_ASC", "PRICE_DESC", "AREA_DESC", "DISTANCE_ASC"]},
            "page": {"type": "integer", "minimum": 1},
            "pageSize": {"type": "integer", "minimum": 1, "maximum": 50},
        },
    }
    return [
        {
            "type": "function",
            "function": {
                "name": "extract_filters_from_text",
                "description": "Extract structured real-estate filters from the user's message and merge them with useful prior context.",
                "parameters": {
                    "type": "object",
                    "required": ["message"],
                    "properties": {
                        "message": {"type": "string", "description": "The user's natural language request."}
                    },
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "build_clarification",
                "description": "Prepare a focused clarification question and suggestions when the request is vague or incomplete.",
                "parameters": {
                    "type": "object",
                    "required": ["user_message", "filters"],
                    "properties": {
                        "user_message": {"type": "string", "description": "The user's latest message."},
                        "filters": filter_object_schema,
                    },
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "search_properties",
                "description": "Search the grounded platform property data using the provided filters.",
                "parameters": {
                    "type": "object",
                    "required": ["filters"],
                    "properties": {
                        "filters": filter_object_schema,
                    },
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "relax_search_filters",
                "description": "Broaden restrictive filters before trying another search when a direct match is not found.",
                "parameters": {
                    "type": "object",
                    "required": ["filters"],
                    "properties": {
                        "filters": filter_object_schema,
                    },
                },
            },
        },
    ]


class LlmProvider:
    @property
    def provider_name(self) -> str:
        raise NotImplementedError

    def assist(self, toolbox: AgentToolbox) -> AgentOutcome:
        raise NotImplementedError


class OllamaProvider(LlmProvider):
    def __init__(self, model: str) -> None:
        self.model = model

    @property
    def provider_name(self) -> str:
        return f"ollama:{self.model}"

    def assist(self, toolbox: AgentToolbox) -> AgentOutcome:
        trace_id = toolbox.trace_id
        initial_extracted = toolbox.extract_filters(toolbox.user_message)
        if _is_context_followup_like(toolbox.user_message) and toolbox.prior_filters:
            initial_filters = dict(toolbox.prior_filters)
            initial_warnings = list(initial_extracted.warnings) + ["Context follow-up; reusing prior filters."]
        else:
            initial_filters = toolbox.merge_filters(initial_extracted.filters, toolbox.prior_filters)
            initial_warnings = list(initial_extracted.warnings)
        logger.info(
            "[AI Chat][%s] assist start model=%s message=%r prior_filters=%s initial_filters=%s warnings=%s",
            trace_id,
            self.model,
            toolbox.user_message,
            toolbox.prior_filters,
            initial_filters,
            initial_warnings,
        )

        state: dict[str, Any] = {
            "intent": "GUIDANCE",
            "should_search": False,
            "clarifying_question": None,
            "suggestions": [],
            "filters": initial_filters,
            "suggested_filters": toolbox.suggested_filters(initial_filters),
            "relaxed_filters": [],
            "missing_fields": [],
            "total": 0,
            "items": [],
        }

        def extract_filters_from_text(message: str | None = None, text: str | None = None, **_: Any) -> dict[str, Any]:
            resolved_message = message or text or toolbox.user_message
            extracted = toolbox.extract_filters(resolved_message)
            if _is_context_followup_like(resolved_message) and toolbox.prior_filters:
                filters = dict(toolbox.prior_filters)
                warnings = list(extracted.warnings) + ["Context follow-up; reused prior filters."]
            else:
                filters = toolbox.merge_filters(extracted.filters, toolbox.prior_filters)
                warnings = list(extracted.warnings)
            state["filters"] = filters
            state["suggested_filters"] = toolbox.suggested_filters(filters)
            logger.info(
                "[AI Chat][%s] tool extract_filters_from_text message=%r filters=%s warnings=%s",
                trace_id,
                resolved_message,
                filters,
                warnings,
            )
            return {
                "normalized_query": extracted.normalized_query,
                "filters": filters,
                "warnings": warnings,
            }

        def build_clarification(
            user_message: str | None = None,
            filters: dict[str, Any] | None = None,
            message: str | None = None,
            **_: Any,
        ) -> dict[str, Any]:
            resolved_message = user_message or message or toolbox.user_message
            resolved_filters = _coerce_filters_arg(filters) or state["filters"]
            state["intent"] = "GREETING" if toolbox.is_greeting(resolved_message) else "CLARIFY"
            state["filters"] = resolved_filters
            state["suggested_filters"] = toolbox.suggested_filters(resolved_filters)
            state["clarifying_question"] = "__pending__"
            has_transaction = any(key in resolved_filters for key in ("transaction",))
            has_location = any(key in resolved_filters for key in ("city", "area", "district", "projectName"))
            has_budget_or_type = any(key in resolved_filters for key in ("minPrice", "maxPrice", "type"))
            missing_fields: list[str] = []
            if not has_transaction:
                missing_fields.append("transaction")
            if not has_location:
                missing_fields.append("location")
            if not has_budget_or_type:
                missing_fields.append("budget_or_type")
            state["missing_fields"] = missing_fields
            if not missing_fields and _should_force_grounded_search(resolved_filters):
                state["intent"] = "GUIDANCE"
                state["clarifying_question"] = None
                state["missing_fields"] = []
            logger.info(
                "[AI Chat][%s] tool build_clarification intent=%s filters=%s missing_fields=%s",
                trace_id,
                state["intent"],
                resolved_filters,
                missing_fields,
            )
            return {
                "missing_fields": missing_fields,
                "known_filters": resolved_filters,
                "intent": state["intent"],
                "user_message": resolved_message,
            }

        def search_properties(filters: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
            resolved_filters = _coerce_filters_arg(filters) or state["filters"]
            search_result, items = toolbox.search(resolved_filters)
            total = int(search_result.get("total", 0))
            if total == 0:
                state["intent"] = "NO_RESULTS"
            else:
                state["intent"] = "COMPARE" if "compare" in toolbox.user_message.lower() else "SEARCH_RESULTS"
            state["should_search"] = True
            state["filters"] = resolved_filters
            state["suggested_filters"] = toolbox.suggested_filters(resolved_filters)
            state["clarifying_question"] = None
            state["total"] = total
            state["items"] = items
            logger.info(
                "[AI Chat][%s] tool search_properties filters=%s total=%s item_titles=%s",
                trace_id,
                resolved_filters,
                total,
                [item.get("title") or item.get("projectName") for item in items[:5]],
            )
            return {
                "filters": resolved_filters,
                "total": total,
                "items": _items_for_llm(items),
            }

        def ensure_grounded_search() -> None:
            if state["should_search"]:
                logger.info("[AI Chat][%s] ensure_grounded_search skipped already searched", trace_id)
                return
            if _is_acknowledgement_like(toolbox.user_message):
                logger.info("[AI Chat][%s] ensure_grounded_search skipped acknowledgement message=%r", trace_id, toolbox.user_message)
                return
            if not _should_force_grounded_search(state["filters"]):
                logger.info("[AI Chat][%s] ensure_grounded_search skipped non-searchable filters=%s", trace_id, state["filters"])
                return
            logger.info("[AI Chat][%s] ensure_grounded_search forcing search with filters=%s", trace_id, state["filters"])
            search_properties(state["filters"])

        def relax_search_filters(filters: dict[str, Any] | None = None, **_: Any) -> dict[str, Any]:
            resolved_filters = _coerce_filters_arg(filters) or state["filters"]
            relaxed_filters, just_relaxed = toolbox.relax_filters(resolved_filters)
            state["filters"] = relaxed_filters
            state["relaxed_filters"] = _dedupe_strings(state["relaxed_filters"] + just_relaxed)
            state["suggested_filters"] = toolbox.suggested_filters(relaxed_filters)
            logger.info(
                "[AI Chat][%s] tool relax_search_filters from=%s to=%s relaxed_keys=%s",
                trace_id,
                resolved_filters,
                relaxed_filters,
                just_relaxed,
            )
            return {
                "filters": relaxed_filters,
                "relaxed_filters": just_relaxed,
            }

        executors: dict[str, Callable[..., dict[str, Any]]] = {
            "extract_filters_from_text": extract_filters_from_text,
            "build_clarification": build_clarification,
            "search_properties": search_properties,
            "relax_search_filters": relax_search_filters,
        }

        messages: list[dict[str, Any]] = [
            {"role": "system", "content": AGENT_SYSTEM_PROMPT},
            {
                "role": "system",
                "content": (
                    "Known conversation context:\n"
                    f"- requested_language: {toolbox.language}\n"
                    f"- latest_user_message: {toolbox.user_message}\n"
                    f"- prior_filters: {_json_text(toolbox.prior_filters)}\n"
                    f"- merged_filters: {_json_text(initial_filters)}\n"
                    f"- extractor_warnings: {_json_text(initial_extracted.warnings)}\n"
                    "Treat merged_filters as the best current understanding unless a later tool result changes them."
                ),
            },
            *toolbox.history[-8:],
            {"role": "user", "content": toolbox.user_message},
        ]

        def append_tool_result(name: str, result: dict[str, Any]) -> None:
            messages.append(
                {
                    "role": "tool",
                    "tool_name": name,
                    "content": json.dumps(result, ensure_ascii=False),
                }
            )

        def search_and_relax_until_useful(filters: dict[str, Any], max_relaxations: int = 3) -> None:
            result = search_properties(filters)
            append_tool_result("search_properties", result)

            relaxations = 0
            while state["total"] == 0 and relaxations < max_relaxations:
                relaxed_result = relax_search_filters(state["filters"])
                if not relaxed_result.get("relaxed_filters"):
                    break
                append_tool_result("relax_search_filters", relaxed_result)
                result = search_properties(state["filters"])
                append_tool_result("search_properties", result)
                relaxations += 1

        def apply_completion_guards() -> None:
            if state["should_search"]:
                if state["total"] == 0 and not state["relaxed_filters"]:
                    logger.info("[AI Chat][%s] completion guard relaxing empty search filters=%s", trace_id, state["filters"])
                    search_and_relax_until_useful(state["filters"])
                return

            if state["clarifying_question"]:
                if _is_more_details_like(toolbox.user_message) and _should_force_grounded_search(state["filters"]):
                    logger.info("[AI Chat][%s] completion guard overriding clarification for detail follow-up", trace_id)
                    state["clarifying_question"] = None
                else:
                    return

            if _should_force_grounded_search(state["filters"]):
                logger.info("[AI Chat][%s] completion guard executing search filters=%s", trace_id, state["filters"])
                search_and_relax_until_useful(state["filters"])
                return

            logger.info("[AI Chat][%s] completion guard executing clarification filters=%s", trace_id, state["filters"])
            result = build_clarification(user_message=toolbox.user_message, filters=state["filters"])
            append_tool_result("build_clarification", result)

        def finalize_response() -> AgentOutcome:
            apply_completion_guards()
            payload: dict[str, Any] = {}
            raw_final_content = ""
            validation_problem = ""

            def final_validation_problem(reply: str, suggestions: list[Any]) -> str:
                if not reply:
                    return "empty_reply"
                if not _matches_requested_language(reply, suggestions, toolbox.language):
                    return "wrong_language_or_mojibake"
                if not _mentions_relaxed_result(reply, state["relaxed_filters"], toolbox.language):
                    return "missing_relaxed_result_disclosure"
                if not _mentions_returned_item_details(reply, state["items"]):
                    return "missing_returned_item_details"
                return ""

            def final_reply_requirements() -> list[str]:
                requirements: list[str] = []
                if state["intent"] == "GREETING" or toolbox.is_greeting(toolbox.user_message):
                    requirements.extend(
                        [
                            "Greet warmly like a real estate customer-support assistant.",
                            "Briefly say you can help search, compare prices/payment plans, or explain the process.",
                            "Ask one easy starter question.",
                        ]
                    )
                missing_fields = state["missing_fields"]
                if missing_fields:
                    if "transaction" in missing_fields and "location" in missing_fields:
                        requirements.append("Ask whether the user wants to buy, rent, or vacation, and ask for the city or area.")
                    elif "transaction" in missing_fields:
                        requirements.append("Ask whether the user wants to buy, rent, or vacation.")
                    elif "location" in missing_fields:
                        requirements.append("Ask for the city, area, district, or project the user prefers.")
                    elif "budget_or_type" in missing_fields:
                        requirements.append("Ask for a budget range or preferred property type.")
                elif state["clarifying_question"]:
                    requirements.append(f"Ask this clarification naturally: {state['clarifying_question']}")
                if state["should_search"] and state["items"]:
                    first_item = state["items"][0]
                    title = str(first_item.get("title") or first_item.get("projectName") or "").strip()
                    price = first_item.get("rentPrice") if first_item.get("transaction") == "RENT" else first_item.get("price")
                    currency = str(first_item.get("currency") or "").strip()
                    location = ", ".join(
                        [
                            str(part)
                            for part in (first_item.get("district"), first_item.get("area"), first_item.get("city"))
                            if part
                        ]
                    )
                    if state["relaxed_filters"]:
                        requirements.append(
                            "State that no exact result was found for the original request and this is a broadened alternative."
                        )
                        requirements.append(
                            "Mention these relaxed constraints: " + ", ".join(state["relaxed_filters"])
                        )
                    if title:
                        requirements.append(f"Include this exact returned title in the reply: {title}")
                    if price is not None and currency:
                        requirements.append(f"Include this exact price and currency in the reply: {int(price):,} {currency}")
                    if location:
                        requirements.append(f"Include this exact location in the reply: {location}")
                    requirements.append("Include bedrooms, bathrooms, or area only when present in items.")
                    requirements.append("Do not convert currency or estimate approximate values.")
                if state["should_search"] and not state["items"]:
                    requirements.append("Explain that no matching property was found and ask for one practical refinement.")
                return requirements

            def build_final_context(reason: str = "") -> dict[str, Any]:
                return {
                    "validation_problem_to_fix": reason,
                    "requested_language": toolbox.language,
                    "latest_user_message": toolbox.user_message,
                    "recent_history": toolbox.history[-6:],
                    "intent": state["intent"],
                    "should_search": state["should_search"],
                    "original_filters": initial_filters,
                    "current_filters": state["filters"],
                    "relaxed_filters": state["relaxed_filters"],
                    "missing_fields": state["missing_fields"],
                    "clarifying_question": state["clarifying_question"],
                    "total": state["total"],
                    "items": _items_for_llm(state["items"]),
                    "required_reply_points": final_reply_requirements(),
                }

            def final_system_prompt(task: str) -> str:
                language_rule = (
                    "The reply, clarifying_question, and suggestions MUST be natural English using ASCII letters, numbers, and punctuation only. "
                    "Never output Arabic script, mojibake, transliterated Arabic, or mixed-language text."
                    if toolbox.language == "EN"
                    else "The reply, clarifying_question, and suggestions MUST be Arabic script. Keep exact property titles, project names, unit codes, and place names as shown in items."
                )
                return (
                    f"{task} Return only JSON matching this schema: "
                    + json.dumps(FINAL_RESPONSE_SCHEMA, ensure_ascii=False)
                    + ". Use only the state packet and required_reply_points; do not invent facts. "
                    + "Every required_reply_points entry is mandatory for the reply field; copy exact titles, prices, currencies, and locations when provided. "
                    + "Do not move required facts only into suggestions. "
                    + language_rule
                    + " If items exist, name at least one real returned title and include price/currency and location when present in the state packet. "
                    + "If relaxed_filters is not empty, explicitly say the results are broadened alternatives and mention the changed constraints. "
                    + "When the result is broadened, do not say it matches the user's original search exactly. "
                    + "Do not convert currencies, estimate exchange rates, or add approximate values unless the exact converted value is present in the state packet. "
                    + "Supported property types are apartment, villa, duplex, penthouse, chalet, land, and commercial; do not suggest unsupported types like house, condo, or townhouse. "
                    + "Never offer unsupported actions such as scheduling a viewing. "
                    + "Return two or three suggestions. Suggestions must be short plain user prompts without icons, markdown, or unsupported actions."
                )

            def repair_final_payload(reason: str) -> dict[str, Any]:
                repair_context = build_final_context(reason)
                repair_context.update({
                    "reason": reason,
                    "invalid_payload": payload,
                    "raw_final_content": raw_final_content[:1000],
                })
                best_repaired_payload = payload

                for repair_attempt in range(2):
                    repair_response = ollama.chat(
                        model=self.model,
                        messages=[
                            {
                                "role": "system",
                                "content": final_system_prompt(
                                    "Repair the assistant's final real-estate chat response."
                                ),
                            },
                            {"role": "user", "content": json.dumps(repair_context, ensure_ascii=False)},
                        ],
                        format=FINAL_RESPONSE_SCHEMA,
                        options={"temperature": 0, "num_predict": 280},
                    )
                    repair_message = _as_message_dict(
                        getattr(repair_response, "message", None) or repair_response.get("message", {})
                    )
                    repaired_payload = _safe_json_object((repair_message.get("content") or "").strip())
                    logger.info(
                        "[AI Chat][%s] final repair attempt=%s reason=%s payload=%s",
                        trace_id,
                        repair_attempt + 1,
                        reason,
                        repaired_payload,
                    )
                    repaired_reply = str(repaired_payload.get("reply") or "").strip()
                    repaired_suggestions = repaired_payload.get("suggestions", [])
                    if repaired_reply:
                        best_repaired_payload = repaired_payload
                    if repaired_reply and _matches_requested_language(
                        repaired_reply, repaired_suggestions, toolbox.language
                    ) and _mentions_relaxed_result(repaired_reply, state["relaxed_filters"], toolbox.language):
                        return repaired_payload

                return best_repaired_payload

            for final_attempt in range(2):
                final_response = ollama.chat(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": final_system_prompt(
                                "Write the final customer-facing response for a real estate assistant from a compact state packet."
                            ),
                        },
                        {"role": "user", "content": json.dumps(build_final_context(validation_problem), ensure_ascii=False)},
                    ],
                    format=FINAL_RESPONSE_SCHEMA,
                    options={"temperature": 0, "num_predict": 320},
                )
                final_message = _as_message_dict(getattr(final_response, "message", None) or final_response.get("message", {}))
                raw_final_content = (final_message.get("content") or "").strip()
                payload = _safe_json_object(raw_final_content)
                logger.info("[AI Chat][%s] final attempt=%s payload=%s", trace_id, final_attempt + 1, payload)
                reply_candidate = str(payload.get("reply") or "").strip()
                suggestions_candidate = payload.get("suggestions", [])
                validation_problem = final_validation_problem(reply_candidate, suggestions_candidate)
                if not validation_problem:
                    break
                if reply_candidate:
                    logger.warning(
                        "[AI Chat][%s] final attempt=%s final validation failed requested=%s relaxed=%s reply_preview=%r",
                        trace_id,
                        final_attempt + 1,
                        toolbox.language,
                        state["relaxed_filters"],
                        reply_candidate[:180],
                    )

            reply = str(payload.get("reply") or "").strip()
            if not reply:
                logger.warning("[AI Chat][%s] empty structured final reply raw_content=%r", trace_id, raw_final_content[:300])
                payload = repair_final_payload("empty_reply")
                reply = str(payload.get("reply") or "").strip()
            elif not _matches_requested_language(reply, payload.get("suggestions", []), toolbox.language):
                logger.warning("[AI Chat][%s] repairing final reply language=%s", trace_id, toolbox.language)
                payload = repair_final_payload("wrong_language")
                reply = str(payload.get("reply") or "").strip()
            elif not _mentions_relaxed_result(reply, state["relaxed_filters"], toolbox.language):
                logger.warning("[AI Chat][%s] repairing final reply relaxed_filters=%s", trace_id, state["relaxed_filters"])
                payload = repair_final_payload("missing_relaxed_result_disclosure")
                reply = str(payload.get("reply") or "").strip()
            elif not _mentions_returned_item_details(reply, state["items"]):
                logger.warning("[AI Chat][%s] repairing final reply missing returned item details", trace_id)
                payload = repair_final_payload("missing_returned_item_details")
                reply = str(payload.get("reply") or "").strip()

            if not reply:
                logger.error("[AI Chat][%s] empty structured final reply after repair raw_content=%r", trace_id, raw_final_content[:300])
                raise RuntimeError("The LLM returned an empty structured reply.")
            if not _matches_requested_language(reply, payload.get("suggestions", []), toolbox.language):
                logger.error("[AI Chat][%s] final reply still mismatched requested language=%s; returning best effort", trace_id, toolbox.language)
            if not _mentions_relaxed_result(reply, state["relaxed_filters"], toolbox.language):
                logger.error("[AI Chat][%s] final reply still missing relaxed result disclosure=%s; returning best effort", trace_id, state["relaxed_filters"])
            if not _mentions_returned_item_details(reply, state["items"]):
                logger.error("[AI Chat][%s] final reply still missing returned item details; returning best effort", trace_id)

            final_intent = str(payload.get("intent") or state["intent"])
            return AgentOutcome(
                reply=reply,
                intent=str(state["intent"] if state["should_search"] else final_intent),
                should_search=bool(state["should_search"]),
                clarifying_question=payload.get("clarifying_question"),
                suggestions=_sanitize_suggestions(payload.get("suggestions", [])),
                suggested_filters=state["suggested_filters"],
                extracted_filters=state["filters"],
                relaxed_filters=state["relaxed_filters"],
                total=state["total"],
                items=state["items"],
            )

        try:
            for iteration in range(6):
                logger.info("[AI Chat][%s] ollama loop iteration=%s state=%s", trace_id, iteration + 1, {
                    "intent": state["intent"],
                    "should_search": state["should_search"],
                    "filters": state["filters"],
                    "total": state["total"],
                })
                response = ollama.chat(
                    model=self.model,
                    messages=messages,
                    tools=_tool_schemas(),
                    options={"temperature": 0.2},
                )
                message = _as_message_dict(getattr(response, "message", None) or response.get("message", {}))
                messages.append(message)
                logger.info(
                    "[AI Chat][%s] ollama response role=%s content_preview=%r",
                    trace_id,
                    message.get("role"),
                    (message.get("content") or "")[:240],
                )

                tool_calls = _tool_calls_from_message(message)
                if not tool_calls:
                    return finalize_response()

                for call in tool_calls:
                    function = call.get("function", {})
                    name = function.get("name")
                    args = _normalize_tool_arguments(function.get("arguments", {}) or {})
                    logger.info("[AI Chat][%s] tool call name=%s args=%s", trace_id, name, args)
                    executor = executors.get(name)
                    if executor is None:
                        logger.warning("[AI Chat][%s] unknown tool call name=%s", trace_id, name)
                        continue
                    result = executor(**args)
                    logger.info("[AI Chat][%s] tool result name=%s result=%s", trace_id, name, result)
                    append_tool_result(name, result)
                return finalize_response()
        except Exception as exc:
            logger.exception("[AI Chat][%s] ollama tool loop failed: %s", trace_id, exc)
            raise RuntimeError(f"Ollama tool loop failed: {exc}") from exc

        logger.error("[AI Chat][%s] ollama tool loop ended without a final response", trace_id)
        raise RuntimeError("Ollama tool loop ended without a final response.")


class FallbackProvider(LlmProvider):
    @property
    def provider_name(self) -> str:
        return "unavailable"

    def assist(self, toolbox: AgentToolbox) -> AgentOutcome:
        raise RuntimeError("Ollama is unavailable. No hardcoded assistant responses are configured.")


def build_llm_provider() -> LlmProvider:
    provider = os.getenv("LLM_PROVIDER", "ollama").strip().lower()
    model = os.getenv("OLLAMA_MODEL", "llama3.1").strip() or "llama3.1"

    if provider == "ollama" and ollama is not None:
        return OllamaProvider(model)

    return FallbackProvider()
