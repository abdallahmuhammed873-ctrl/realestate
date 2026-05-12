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
You are a grounded real estate assistant.

Rules:
- Answer only from the retrieved platform records.
- Do not invent prices, projects, locations, availability, or payment plans.
- If there are no matches, clearly say that no matching properties were found.
- Keep the answer concise, practical, and helpful.
- Mention useful filters or next refinements when the results are broad.
""".strip()


class LlmProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def answer(self, language: str, user_question: str, filters: dict[str, Any], properties: list[dict[str, Any]]) -> str:
        raise NotImplementedError


class OllamaProvider(LlmProvider):
    def __init__(self, model: str) -> None:
        self.model = model

    @property
    def provider_name(self) -> str:
        return f"ollama:{self.model}"

    def answer(self, language: str, user_question: str, filters: dict[str, Any], properties: list[dict[str, Any]]) -> str:
        prompt = {
            "language": language,
            "user_question": user_question,
            "filters": filters,
            "properties": properties,
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
            return FallbackProvider().answer(language, user_question, filters, properties)


class FallbackProvider(LlmProvider):
    @property
    def provider_name(self) -> str:
        return "fallback"

    def answer(self, language: str, user_question: str, filters: dict[str, Any], properties: list[dict[str, Any]]) -> str:
        if not properties:
            return (
                "لم أجد عقارات مطابقة في بيانات المنصة المشتركة."
                if language == "AR"
                else "I could not find any matching properties in the shared platform data."
            )

        lines = []
        for item in properties[:3]:
            title = item.get("title") or item.get("projectName") or "Property"
            location = ", ".join([part for part in [item.get("district"), item.get("area"), item.get("city")] if part])
            price = item.get("rentPrice") if item.get("transaction") == "RENT" else item.get("price")
            bedrooms = item.get("bedrooms")
            area_sqm = item.get("areaSqm")
            detail = f"{title}"
            meta = []
            if location:
                meta.append(location)
            if price:
                meta.append(f"EGP {int(price):,}")
            if bedrooms is not None:
                meta.append(f"{bedrooms} BR")
            if area_sqm is not None:
                meta.append(f"{area_sqm} sqm")
            if meta:
                detail += f" ({', '.join(meta)})"
            lines.append(detail)

        intro = "أفضل النتائج الحالية:" if language == "AR" else "Top matching results right now:"
        outro = (
            "إذا أردت، أقدر أضيّق النتائج حسب الميزانية أو المنطقة أو عدد الغرف."
            if language == "AR"
            else "If you want, I can narrow these further by budget, area, or bedroom count."
        )
        return "\n".join([intro, *[f"- {line}" for line in lines], outro])


def build_llm_provider() -> LlmProvider:
    provider = os.getenv("LLM_PROVIDER", "ollama").strip().lower()
    model = os.getenv("OLLAMA_MODEL", "llama3.1").strip() or "llama3.1"

    if provider == "ollama" and ollama is not None:
        return OllamaProvider(model)

    return FallbackProvider()
