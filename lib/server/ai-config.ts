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
  const fallbackModels = configuredFallbacks.length > 0 ? configuredFallbacks : ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
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

export function getGeminiLiveModel() {
  return process.env.GEMINI_LIVE_MODEL?.trim() || "gemini-2.5-flash-native-audio-preview-12-2025";
}

export function getGeminiLiveVoice() {
  return process.env.GEMINI_LIVE_VOICE?.trim() || "Kore";
}

export function getGeminiLiveTokenMinutes() {
  const configured = Number(process.env.GEMINI_LIVE_TOKEN_MINUTES);
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, 60) : 30;
}

export function getGeminiStatus() {
  const apiKey = getGeminiApiKey();
  return {
    configured: apiKey.length > 0,
    provider: "google-gemini",
    model: getGeminiModel(),
    fallbackModels: getGeminiFallbackModels(),
    liveModel: getGeminiLiveModel(),
    liveVoice: getGeminiLiveVoice()
  };
}
