export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || "";
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
}

function parseModelList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

export function getGeminiFallbackModels() {
  const primaryModel = getGeminiModel();
  const configuredFallbacks = parseModelList(process.env.GEMINI_FALLBACK_MODELS || process.env.GEMINI_FALLBACK_MODEL);
  const fallbackModels = configuredFallbacks.length > 0 ? configuredFallbacks : ["gemini-2.5-flash"];
  const seen = new Set([primaryModel]);

  return fallbackModels.filter((model) => {
    if (seen.has(model)) return false;
    seen.add(model);
    return true;
  });
}

export function getGeminiModelCandidates() {
  return [getGeminiModel(), ...getGeminiFallbackModels()];
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
    model: getGeminiModel(),
    fallbackModels: getGeminiFallbackModels()
  };
}
