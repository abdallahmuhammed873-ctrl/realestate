from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod
from typing import Any

try:
    import ollama  # type: ignore
except Exception:  # pragma: no cover - optional dependency at runtime
    ollama = None


SYSTEM_PROMPT = """
You are a grounded, interactive real estate assistant.

Rules:
- Answer only from the retrieved platform records and orchestration context.
- Never invent prices, projects, locations, availability, or payment plans.
- Be helpful, structured, and conversational.
- Summarize what the user is looking for before listing results.
- When results exist, highlight the best 2 to 4 options with short bullets.
- When the search was relaxed, mention that clearly.
- When the request is vague, ask one focused follow-up question.
""".strip()


class LlmProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def answer(
        self,
        language: str,
        user_question: str,
        filters: dict[str, Any],
        properties: list[dict[str, Any]],
        result_total: int = 0,
        relaxed_filters: list[str] | None = None,
        conversation_summary: str | None = None,
    ) -> str:
        raise NotImplementedError


class OllamaProvider(LlmProvider):
    def __init__(self, model: str) -> None:
        self.model = model

    @property
    def provider_name(self) -> str:
        return f"ollama:{self.model}"

    def answer(
        self,
        language: str,
        user_question: str,
        filters: dict[str, Any],
        properties: list[dict[str, Any]],
        result_total: int = 0,
        relaxed_filters: list[str] | None = None,
        conversation_summary: str | None = None,
    ) -> str:
        prompt = {
            "language": language,
            "user_question": user_question,
            "filters": filters,
            "properties": properties,
            "result_total": result_total,
            "relaxed_filters": relaxed_filters or [],
            "conversation_summary": conversation_summary,
        }
        try:
            response = ollama.chat(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
                ],
            )
            return response["message"]["content"].strip()
        except Exception:
            return FallbackProvider().answer(
                language=language,
                user_question=user_question,
                filters=filters,
                properties=properties,
                result_total=result_total,
                relaxed_filters=relaxed_filters,
                conversation_summary=conversation_summary,
            )


class FallbackProvider(LlmProvider):
    @property
    def provider_name(self) -> str:
        return "fallback"

    def answer(
        self,
        language: str,
        user_question: str,
        filters: dict[str, Any],
        properties: list[dict[str, Any]],
        result_total: int = 0,
        relaxed_filters: list[str] | None = None,
        conversation_summary: str | None = None,
    ) -> str:
        if not properties:
            return (
                "لم أجد عقارات مطابقة في بيانات المنصة المشتركة. يمكنني توسيع الميزانية أو تغيير المنطقة أو نوع العقار."
                if language == "AR"
                else "I could not find matching properties in the shared platform data. I can broaden the budget, location, or property type next."
            )

        intro = (
            "هذه أقرب النتائج لطلبك الآن:"
            if language == "AR"
            else "These are the closest matches for your request right now:"
        )
        if result_total > 0:
            intro += f" ({result_total} total)"

        if relaxed_filters:
            relaxed_text = ", ".join(relaxed_filters)
            intro += (
                f"\nوسّعت البحث قليلًا عبر: {relaxed_text}."
                if language == "AR"
                else f"\nI widened the search slightly by relaxing: {relaxed_text}."
            )

        if conversation_summary:
            intro = f"{conversation_summary}\n{intro}"

        lines: list[str] = []
        for item in properties[:4]:
            title = item.get("title") or item.get("projectName") or "Property"
            location = ", ".join([part for part in [item.get("district"), item.get("area"), item.get("city")] if part])
            price = item.get("rentPrice") if item.get("transaction") == "RENT" else item.get("price")
            bedrooms = item.get("bedrooms")
            area_sqm = item.get("areaSqm")
            payment_type = item.get("paymentType")

            meta: list[str] = []
            if location:
                meta.append(location)
            if price:
                meta.append(f"EGP {int(price):,}")
            if bedrooms is not None:
                meta.append(f"{bedrooms} BR")
            if area_sqm is not None:
                meta.append(f"{area_sqm} sqm")
            if payment_type:
                meta.append(str(payment_type).title())

            detail = title if not meta else f"{title} ({', '.join(meta)})"
            lines.append(detail)

        outro = (
            "إذا أردت، أقدر أضيّق النتائج حسب الميزانية أو المنطقة أو خطة الدفع أو عدد الغرف."
            if language == "AR"
            else "If you want, I can narrow these further by budget, area, payment plan, or bedroom count."
        )
        return "\n".join([intro, *[f"- {line}" for line in lines], outro])


def build_llm_provider() -> LlmProvider:
    provider = os.getenv("LLM_PROVIDER", "ollama").strip().lower()
    model = os.getenv("OLLAMA_MODEL", "llama3.1").strip() or "llama3.1"

    if provider == "ollama" and ollama is not None:
        return OllamaProvider(model)

    return FallbackProvider()
