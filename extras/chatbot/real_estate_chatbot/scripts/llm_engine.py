import ollama

SYSTEM_PROMPT = """
You are a smart real estate assistant.

Rules:
- ONLY answer using the provided data.
- Do NOT invent any prices, projects, areas, unit types, locations, or availability.
- If there is no matching data, say exactly: No matching properties found in the dataset.
- Keep the answer clear, helpful, and professional.
- Summarize the best matching options briefly.
- If the user asks for recommendations, base them only on the matching rows.
"""


def ask_llama(user_question, retrieved_data_text):
    prompt = f"""
User question:
{user_question}

Retrieved property data:
{retrieved_data_text}
"""

    response = ollama.chat(
        model="llama3.1",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )

    return response["message"]["content"]