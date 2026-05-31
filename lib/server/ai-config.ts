export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || "";
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
}

export function getAiTimeoutMs() {
  const configured = Number(process.env.GEMINI_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : 60_000;
}

export function getGeminiStatus() {
  const apiKey = getGeminiApiKey();
  return {
    configured: apiKey.length > 0,
    provider: "google-gemini",
    model: getGeminiModel()
  };
}
