from __future__ import annotations

import os

import pandas as pd
import requests
import streamlit as st

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://127.0.0.1:8001").rstrip("/")

st.set_page_config(page_title="AI Service Debug UI", page_icon="🏠", layout="wide")


def send_chat(message: str, language: str) -> dict:
    response = requests.post(
        f"{AI_SERVICE_URL}/chat",
        json={"message": message, "language": language},
        timeout=20,
    )
    response.raise_for_status()
    return response.json()


def fetch_health() -> dict:
    response = requests.get(f"{AI_SERVICE_URL}/health", timeout=5)
    response.raise_for_status()
    return response.json()


if "messages" not in st.session_state:
    st.session_state.messages = []

with st.sidebar:
    st.title("AI Debug")
    st.caption("Internal Streamlit client for the Python AI service.")
    language = st.selectbox("Language", options=["EN", "AR"], index=0)
    if st.button("Check health", use_container_width=True):
        try:
            st.json(fetch_health())
        except Exception as exc:  # pragma: no cover - debug UI only
            st.error(str(exc))

st.title("Unified Real Estate AI")
st.caption("This UI talks to the Python service, which talks to Next.js internal PostgreSQL-backed AI endpoints.")

for item in st.session_state.messages:
    with st.chat_message(item["role"]):
        st.markdown(item["content"])
        if item.get("filters"):
            st.caption(f"Filters: {item['filters']}")
        if item.get("items"):
            st.dataframe(pd.DataFrame(item["items"]), use_container_width=True)

prompt = st.chat_input("Ask about properties...")

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Querying AI service..."):
            try:
                payload = send_chat(prompt, language)
                st.markdown(payload["reply"])
                if payload.get("extractedFilters"):
                    st.caption(f"Filters: {payload['extractedFilters']}")
                if payload.get("items"):
                    st.dataframe(pd.DataFrame(payload["items"]), use_container_width=True)
                st.session_state.messages.append(
                    {
                        "role": "assistant",
                        "content": payload["reply"],
                        "filters": payload.get("extractedFilters"),
                        "items": payload.get("items"),
                    }
                )
            except Exception as exc:  # pragma: no cover - debug UI only
                error_message = f"Service error: {exc}"
                st.error(error_message)
                st.session_state.messages.append({"role": "assistant", "content": error_message})
