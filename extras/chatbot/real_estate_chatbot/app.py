import json
import uuid
from datetime import datetime
from pathlib import Path

import pandas as pd
import streamlit as st

from scripts.query_engine import load_data, filter_properties, summarize_results
from scripts.llm_engine import ask_llama

st.set_page_config(
    page_title="Real Estate AI Assistant",
    page_icon="🏠",
    layout="wide",
    initial_sidebar_state="expanded"
)

# -----------------------------
# Paths
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / "storage"
CHAT_FILE = STORAGE_DIR / "chat_sessions.json"

STORAGE_DIR.mkdir(exist_ok=True)
if not CHAT_FILE.exists():
    CHAT_FILE.write_text("{}", encoding="utf-8")


# -----------------------------
# Styling
# -----------------------------
st.markdown("""
<style>
    :root {
        --bg-main: #07111f;
        --bg-soft: #0d1726;
        --bg-card: #101b2d;
        --bg-card-2: #132238;
        --border: #22344d;
        --text-main: #edf4ff;
        --text-soft: #b7c6da;
        --accent: #4f8cff;
        --accent-soft: #7fb0ff;
        --user-bubble: #2f6fed;
        --shadow: 0 10px 30px rgba(0,0,0,0.22);
    }

    .stApp {
        background:
            radial-gradient(circle at top, #0b1a30 0%, #07111f 45%, #050b14 100%);
    }

    .block-container {
        max-width: 1120px;
        padding-top: 1.2rem;
        padding-bottom: 7rem;
    }

    section[data-testid="stSidebar"] {
        background: linear-gradient(180deg, #0c1626 0%, #132238 100%);
        border-right: 1px solid rgba(122, 148, 184, 0.14);
    }

    section[data-testid="stSidebar"] .block-container {
        padding-top: 1rem;
        padding-bottom: 1rem;
        padding-left: 1rem;
        padding-right: 1rem;
    }

    .sidebar-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 4px 14px 4px;
        color: var(--text-main);
        font-weight: 700;
        font-size: 1.15rem;
    }

    .sidebar-brand-icon {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #2957c8, #4f8cff);
        box-shadow: 0 10px 22px rgba(79, 140, 255, 0.25);
        font-size: 1.1rem;
    }

    .hero-shell {
        display: flex;
        justify-content: center;
        margin-bottom: 1.25rem;
    }

    .hero {
        width: min(100%, 860px);
        background: linear-gradient(135deg, rgba(30,58,138,0.92), rgba(37,99,235,0.88));
        border: 1px solid rgba(255,255,255,0.08);
        color: white;
        border-radius: 24px;
        padding: 22px 26px;
        box-shadow: 0 16px 40px rgba(0,0,0,0.24);
    }

    .hero-title {
        font-size: clamp(1.6rem, 2vw, 2.15rem);
        font-weight: 800;
        line-height: 1.1;
        margin-bottom: 0.35rem;
        letter-spacing: -0.02em;
    }

    .hero-sub {
        color: rgba(255,255,255,0.88);
        font-size: 1rem;
        line-height: 1.55;
        max-width: 680px;
    }

    .top-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-top: 0.15rem;
        margin-bottom: 1rem;
        color: var(--text-soft);
        font-size: 0.95rem;
    }

    .chat-empty {
        width: min(100%, 820px);
        margin: 2rem auto 0 auto;
        background: linear-gradient(180deg, rgba(14,26,44,0.95), rgba(11,20,34,0.98));
        border: 1px solid rgba(122, 148, 184, 0.18);
        border-radius: 24px;
        padding: 36px 28px;
        text-align: center;
        box-shadow: var(--shadow);
    }

    .chat-empty-title {
        color: var(--text-main);
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 0.7rem;
        letter-spacing: -0.02em;
    }

    .chat-empty-sub {
        color: var(--text-soft);
        font-size: 1.03rem;
        line-height: 1.7;
    }

    .chat-wrap {
        width: min(100%, 920px);
        margin: 0 auto;
    }

    .user-bubble-wrap {
        display: flex;
        justify-content: flex-end;
        margin: 14px 0 10px 0;
    }

    .assistant-bubble-wrap {
        display: flex;
        justify-content: flex-start;
        margin: 10px 0 12px 0;
    }

    .user-bubble {
        max-width: 74%;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white;
        padding: 14px 17px;
        border-radius: 22px 22px 8px 22px;
        box-shadow: 0 10px 24px rgba(37, 99, 235, 0.24);
        line-height: 1.55;
        font-size: 1rem;
        word-break: break-word;
    }

    .assistant-bubble {
        max-width: 78%;
        background: linear-gradient(180deg, #0f1b2d, #0d1726);
        color: var(--text-main);
        padding: 15px 17px;
        border-radius: 22px 22px 22px 8px;
        border: 1px solid rgba(122, 148, 184, 0.16);
        box-shadow: var(--shadow);
        line-height: 1.62;
        font-size: 1rem;
        word-break: break-word;
    }

    .results-card {
        width: min(100%, 920px);
        margin: 8px auto 14px auto;
        background: rgba(15, 28, 47, 0.92);
        border: 1px solid rgba(90, 122, 163, 0.22);
        color: #d8e7ff;
        padding: 12px 15px;
        border-radius: 16px;
        font-size: 0.96rem;
    }

    .data-wrap {
        width: min(100%, 920px);
        margin: 0 auto 18px auto;
    }

    div[data-testid="stDataFrame"] {
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid rgba(90, 122, 163, 0.22);
        box-shadow: 0 10px 24px rgba(0,0,0,0.18);
    }

    .stDownloadButton > button {
        border-radius: 12px;
        width: 100%;
        border: 1px solid rgba(122, 148, 184, 0.18);
    }

    .session-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 14px;
        padding: 8px;
        margin-bottom: 10px;
    }

    .dataset-box {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 16px;
        padding: 14px 14px 8px 14px;
        margin-top: 14px;
        color: var(--text-main);
    }

    .dataset-line {
        color: var(--text-soft);
        margin-bottom: 0.55rem;
        font-size: 0.95rem;
    }

    hr {
        border-color: rgba(255,255,255,0.08) !important;
    }

    .stChatInput {
        position: fixed;
        bottom: 1rem;
        left: calc(16rem + 2rem);
        right: 2rem;
        z-index: 100;
        background: transparent;
    }

    @media (max-width: 1200px) {
        .stChatInput {
            left: 2rem;
        }
    }

    @media (max-width: 900px) {
        .hero, .chat-wrap, .results-card, .data-wrap {
            width: 100%;
        }

        .user-bubble, .assistant-bubble {
            max-width: 90%;
        }

        .chat-empty {
            width: 100%;
        }
    }
</style>
""", unsafe_allow_html=True)


# -----------------------------
# Helpers
# -----------------------------
def read_sessions():
    try:
        return json.loads(CHAT_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def write_sessions(data):
    CHAT_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def make_chat_title(first_message: str) -> str:
    cleaned = " ".join(first_message.strip().split())
    if len(cleaned) <= 38:
        return cleaned
    return cleaned[:38] + "..."


def create_new_session():
    sessions = read_sessions()
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "title": "New Chat",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "messages": []
    }
    write_sessions(sessions)
    return session_id


def ensure_session_state():
    if "sessions" not in st.session_state:
        st.session_state.sessions = read_sessions()

    if "current_session_id" not in st.session_state:
        if st.session_state.sessions:
            st.session_state.current_session_id = list(st.session_state.sessions.keys())[-1]
        else:
            st.session_state.current_session_id = create_new_session()
            st.session_state.sessions = read_sessions()


def refresh_sessions():
    st.session_state.sessions = read_sessions()


def add_message_to_session(session_id, role, content, results_count=None, results_df=None):
    sessions = read_sessions()
    session = sessions.get(session_id)

    if not session:
        return

    msg = {
        "role": role,
        "content": content,
        "timestamp": datetime.now().strftime("%H:%M")
    }

    if results_count is not None:
        msg["results_count"] = results_count

    if results_df is not None:
        msg["results_df"] = results_df.to_dict(orient="records")

    session["messages"].append(msg)

    if session["title"] == "New Chat":
        first_user_msg = next((m["content"] for m in session["messages"] if m["role"] == "user"), "New Chat")
        session["title"] = make_chat_title(first_user_msg)

    sessions[session_id] = session
    write_sessions(sessions)
    refresh_sessions()


@st.cache_data
def get_data():
    return load_data()


# -----------------------------
# Main init
# -----------------------------
ensure_session_state()
df = get_data()

sessions = st.session_state.sessions
current_session_id = st.session_state.current_session_id
current_session = sessions.get(current_session_id, {"title": "New Chat", "messages": []})


# -----------------------------
# Sidebar
# -----------------------------
with st.sidebar:
    st.markdown("""
    <div class="sidebar-brand">
        <div class="sidebar-brand-icon">🏠</div>
        <div>Real Estate Assistant</div>
    </div>
    """, unsafe_allow_html=True)

    if st.button("＋ New Chat", use_container_width=True):
        new_id = create_new_session()
        refresh_sessions()
        st.session_state.current_session_id = new_id
        st.rerun()

    st.markdown("---")
    st.write("### Chats")

    sorted_sessions = list(st.session_state.sessions.items())[::-1]

    for session_id, session_data in sorted_sessions:
        title = session_data.get("title", "Untitled Chat")
        created = session_data.get("created_at", "")
        active = session_id == st.session_state.current_session_id

        st.markdown('<div class="session-card">', unsafe_allow_html=True)
        col1, col2 = st.columns([5, 1])

        with col1:
            button_type = "primary" if active else "secondary"
            if st.button(title, key=f"open_{session_id}", use_container_width=True, type=button_type):
                st.session_state.current_session_id = session_id
                st.rerun()

        with col2:
            if st.button("🗑", key=f"delete_{session_id}"):
                sessions = read_sessions()
                sessions.pop(session_id, None)
                write_sessions(sessions)
                refresh_sessions()

                if st.session_state.current_session_id == session_id:
                    if st.session_state.sessions:
                        st.session_state.current_session_id = list(st.session_state.sessions.keys())[-1]
                    else:
                        new_id = create_new_session()
                        refresh_sessions()
                        st.session_state.current_session_id = new_id
                st.rerun()

        st.caption(created)
        st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("""
    <div class="dataset-box">
        <div style="font-weight:700; margin-bottom:0.8rem;">Dataset</div>
    """, unsafe_allow_html=True)
    st.markdown(f'<div class="dataset-line">Rows: <strong>{len(df)}</strong></div>', unsafe_allow_html=True)
    project_count = df["project_name"].dropna().nunique() if "project_name" in df.columns else 0
    st.markdown(f'<div class="dataset-line">Projects: <strong>{project_count}</strong></div>', unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)


# -----------------------------
# Header
# -----------------------------
st.markdown("""
<div class="hero-shell">
    <div class="hero">
        <div class="hero-title">Real Estate AI Assistant</div>
        <div class="hero-sub">
            Ask about projects, budgets, unit types, bedrooms, gardens, roofs, and availability.
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

st.markdown(
    f"""
    <div class="top-row">
        <div><strong>{current_session.get("title", "New Chat")}</strong></div>
        <div>{current_session.get("created_at", "")}</div>
    </div>
    """,
    unsafe_allow_html=True
)

# -----------------------------
# Chat body
# -----------------------------
messages = current_session.get("messages", [])

if not messages:
    st.markdown("""
    <div class="chat-empty">
        <div class="chat-empty-title">Start a new conversation</div>
        <div class="chat-empty-sub">
            Ask anything about your real estate data in natural language.
        </div>
    </div>
    """, unsafe_allow_html=True)
else:
    st.markdown('<div class="chat-wrap">', unsafe_allow_html=True)

    for idx, msg in enumerate(messages):
        if msg["role"] == "user":
            st.markdown(
                f'<div class="user-bubble-wrap"><div class="user-bubble">{msg["content"]}</div></div>',
                unsafe_allow_html=True
            )
        else:
            st.markdown(
                f'<div class="assistant-bubble-wrap"><div class="assistant-bubble">{msg["content"]}</div></div>',
                unsafe_allow_html=True
            )

            if "results_count" in msg:
                st.markdown(
                    f'<div class="results-card"><strong>Results Found:</strong> {msg["results_count"]} properties</div>',
                    unsafe_allow_html=True
                )

            if "results_df" in msg and msg["results_df"]:
                results_df = pd.DataFrame(msg["results_df"])
                st.markdown('<div class="data-wrap">', unsafe_allow_html=True)
                st.dataframe(results_df, use_container_width=True)

                csv_data = results_df.to_csv(index=False).encode("utf-8")
                st.download_button(
                    "Download results",
                    data=csv_data,
                    file_name=f"results_{idx}.csv",
                    mime="text/csv",
                    key=f"download_{current_session_id}_{idx}"
                )
                st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("</div>", unsafe_allow_html=True)


# -----------------------------
# Chat input
# -----------------------------
question = st.chat_input("Ask about real estate...")

if question:
    add_message_to_session(current_session_id, "user", question)

    # Split multi-line input into separate queries
    sub_queries = [q.strip() for q in question.split("\n") if q.strip()]

    if len(sub_queries) == 1:
        results = filter_properties(question, df)
        total_results = len(results)

        llm_input_df = results.head(20)
        retrieved_text = summarize_results(llm_input_df)

        with st.spinner("Thinking..."):
            answer = ask_llama(question, retrieved_text)

        add_message_to_session(
            current_session_id,
            "assistant",
            answer,
            results_count=total_results,
            results_df=results
        )

    else:
        combined_answer_parts = []
        combined_results = []

        with st.spinner("Thinking..."):
            for q in sub_queries:
                results = filter_properties(q, df)
                total_results = len(results)

                llm_input_df = results.head(20)
                retrieved_text = summarize_results(llm_input_df)
                answer = ask_llama(q, retrieved_text)

                combined_answer_parts.append(
                    f"Query: {q}\n{answer}\nResults Found: {total_results}"
                )

                if not results.empty:
                    results_copy = results.copy()
                    results_copy.insert(0, "query", q)
                    combined_results.append(results_copy)

        final_answer = "\n\n".join(combined_answer_parts)

        if combined_results:
            final_results = pd.concat(combined_results, ignore_index=True)
        else:
            final_results = pd.DataFrame()

        add_message_to_session(
            current_session_id,
            "assistant",
            final_answer,
            results_count=len(final_results),
            results_df=final_results
        )

    st.rerun()