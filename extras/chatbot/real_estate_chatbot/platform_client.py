from __future__ import annotations

import json
import logging
import os
import time
import urllib.error
import urllib.request
from typing import Any

logger = logging.getLogger("real_estate_ai.platform")


def _summarize_response(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return {"type": type(payload).__name__}
    items = payload.get("items")
    if isinstance(items, list):
        return {
            "total": payload.get("total"),
            "page": payload.get("page"),
            "pageSize": payload.get("pageSize"),
            "item_count": len(items),
            "item_ids": [item.get("id") for item in items[:5] if isinstance(item, dict)],
        }
    return {key: payload.get(key) for key in ("status", "error") if key in payload}


class PlatformClient:
    def __init__(self) -> None:
        self.base_url = os.getenv("PLATFORM_AI_BASE_URL", "http://127.0.0.1:3000/api/internal/ai").rstrip("/")
        self.api_key = os.getenv("PLATFORM_AI_API_KEY", os.getenv("AI_INTERNAL_API_KEY", "dev-ai-internal-key")).strip()

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None, trace_id: str | None = None) -> Any:
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        if trace_id:
            headers["x-chat-trace-id"] = trace_id

        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=data,
            method=method,
            headers=headers,
        )
        started_at = time.perf_counter()
        logger.info("[AI Platform][%s] %s %s payload=%s", trace_id or "-", method, path, payload)
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                decoded = json.loads(response.read().decode("utf-8"))
                elapsed_ms = round((time.perf_counter() - started_at) * 1000)
                logger.info(
                    "[AI Platform][%s] %s %s -> %s in %sms summary=%s",
                    trace_id or "-",
                    method,
                    path,
                    response.status,
                    elapsed_ms,
                    _summarize_response(decoded),
                )
                return decoded
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            elapsed_ms = round((time.perf_counter() - started_at) * 1000)
            logger.warning(
                "[AI Platform][%s] %s %s failed with %s in %sms body=%s",
                trace_id or "-",
                method,
                path,
                exc.code,
                elapsed_ms,
                body[:500],
            )
            raise RuntimeError(f"Platform request failed with {exc.code}: {body}") from exc
        except urllib.error.URLError as exc:
            elapsed_ms = round((time.perf_counter() - started_at) * 1000)
            logger.warning(
                "[AI Platform][%s] %s %s unreachable in %sms reason=%s",
                trace_id or "-",
                method,
                path,
                elapsed_ms,
                exc.reason,
            )
            raise RuntimeError(f"Platform service is unreachable: {exc.reason}") from exc

    def search_properties(self, filters: dict[str, Any], trace_id: str | None = None) -> dict[str, Any]:
        return self._request("POST", "/properties", filters, trace_id=trace_id)

    def get_health(self) -> bool:
        try:
            payload = self._request("GET", "/health")
            return payload.get("status") == "ok"
        except Exception:
            return False
