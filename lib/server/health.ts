import { prisma } from "./prisma.ts";
import { getBackendUrls, getLocalIpv4Addresses, getPreferredLocalIpv4, getServerBindingConfig } from "./network.ts";
import { getServerRuntimeSummary } from "./runtime-config.ts";

type ServiceCheck = {
  status: "ok" | "error";
  details?: string;
};

function buildTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout)
  };
}

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
  const { aiServiceUrl } = getServerRuntimeSummary();
  const { signal, clear } = buildTimeoutSignal(5_000);

  try {
    const response = await fetch(`${aiServiceUrl}/health`, {
      method: "GET",
      cache: "no-store",
      signal
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        status: "error",
        details: payload?.detail || payload?.error || `AI service returned ${response.status}.`
      };
    }

    return payload?.status === "ok"
      ? { status: "ok" }
      : {
          status: "error",
          details: payload?.detail || "AI service reported a degraded state."
        };
  } catch (error) {
    return {
      status: "error",
      details: error instanceof Error ? error.message : "Unknown AI service health error."
    };
  } finally {
    clear();
  }
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
      url: runtime.aiServiceUrl
    }
  };
}
