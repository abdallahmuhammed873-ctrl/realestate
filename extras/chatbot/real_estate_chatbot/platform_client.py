from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any


class PlatformClient:
    def __init__(self) -> None:
        self.base_url = os.getenv("PLATFORM_AI_BASE_URL", "http://127.0.0.1:3000/api/internal/ai").rstrip("/")
        self.api_key = os.getenv("PLATFORM_AI_API_KEY", os.getenv("AI_INTERNAL_API_KEY", "dev-ai-internal-key")).strip()

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=data,
            method=method,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"Platform request failed with {exc.code}: {body}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Platform service is unreachable: {exc.reason}") from exc

    def search_properties(self, filters: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/properties", filters)

    def get_health(self) -> bool:
        try:
            payload = self._request("GET", "/health")
            return payload.get("status") == "ok"
        except Exception:
            return False
