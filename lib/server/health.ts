import { prisma } from "./prisma.ts";
import { getGeminiStatus } from "./ai-config.ts";
import { getBackendUrls, getLocalIpv4Addresses, getPreferredLocalIpv4, getServerBindingConfig } from "./network.ts";
import { getServerRuntimeSummary } from "./runtime-config.ts";

type ServiceCheck = {
  status: "ok" | "error";
  details?: string;
};

export async function getDatabaseHealthCheck(): Promise<ServiceCheck> {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return { status: "ok" };
  } catch (error) {
    return {
      status: "error",
      details: error instanceof Error ? error.message : "Unknown database health error."
    };
  }
}

export async function getAiServiceHealthCheck(): Promise<ServiceCheck> {
  const gemini = getGeminiStatus();
  if (gemini.configured) {
    return {
      status: "ok",
      details: `${gemini.provider}:${gemini.model}${gemini.fallbackModels.length > 0 ? ` fallback=${gemini.fallbackModels.join(",")}` : ""}`
    };
  }

  return {
    status: "error",
    details: "GEMINI_API_KEY is not configured."
  };
}

export async function getBackendHealthSnapshot() {
  const runtime = getServerRuntimeSummary();
  const binding = getServerBindingConfig();
  const addresses = getLocalIpv4Addresses();
  const preferredIp = getPreferredLocalIpv4();
  const urls = getBackendUrls();
  const [database, aiService] = await Promise.all([getDatabaseHealthCheck(), getAiServiceHealthCheck()]);
  const overallStatus = database.status === "ok" && aiService.status === "ok" ? "ok" : "degraded";

  return {
    status: overallStatus,
    checkedAt: new Date().toISOString(),
    backend: {
      status: "ok" as const,
      binding,
      urls,
      preferredLocalIpv4: preferredIp?.address ?? null,
      localIpv4Addresses: addresses
    },
    database,
    aiService: {
      ...aiService,
      provider: runtime.aiService.provider,
      model: runtime.aiService.model,
      fallbackModels: runtime.aiService.fallbackModels,
      configured: runtime.aiService.configured
    }
  };
}
