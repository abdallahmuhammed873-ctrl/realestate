import { AUTH_COOKIE_NAME } from "../auth-session.ts";
import { getGeminiStatus } from "./ai-config.ts";
import { loadLocalEnv } from "./load-env.ts";
import { getBackendUrls, getPreferredLocalIpv4, getServerBindingConfig } from "./network.ts";

loadLocalEnv();

const LOCAL_DB_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

type DatabaseConnectionSummary = {
  configured: boolean;
  provider: "postgresql";
  host: string;
  port: string;
  database: string;
  mode: "local" | "remote" | "unknown";
};

function parseDatabaseUrl(rawUrl?: string | null): DatabaseConnectionSummary {
  if (!rawUrl?.trim()) {
    return {
      configured: false,
      provider: "postgresql",
      host: "missing",
      port: "missing",
      database: "missing",
      mode: "unknown"
    };
  }

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname || "unknown";
    const port = parsed.port || "5432";
    const database = parsed.pathname.replace(/^\//, "") || "unknown";
    return {
      configured: true,
      provider: "postgresql",
      host,
      port,
      database,
      mode: LOCAL_DB_HOSTS.has(host) ? "local" : "remote"
    };
  } catch {
    return {
      configured: true,
      provider: "postgresql",
      host: "unparseable",
      port: "unknown",
      database: "unknown",
      mode: "unknown"
    };
  }
}

export function getServerRuntimeSummary() {
  const database = parseDatabaseUrl(process.env.DATABASE_URL);
  const aiService = getGeminiStatus();
  const backendBinding = getServerBindingConfig();
  const backendUrls = getBackendUrls();
  const preferredLocalIpv4 = getPreferredLocalIpv4()?.address ?? null;

  return {
    nodeEnv: process.env.NODE_ENV || "development",
    database,
    aiService,
    authCookie: AUTH_COOKIE_NAME,
    backendBinding,
    backendUrls,
    preferredLocalIpv4
  };
}

let runtimeLogged = false;

export function logServerRuntimeOnce() {
  if (runtimeLogged || process.env.NODE_ENV !== "development") return;
  runtimeLogged = true;

  const summary = getServerRuntimeSummary();
  const dbModeLabel =
    summary.database.mode === "local"
      ? "local laptop PostgreSQL"
      : summary.database.mode === "remote"
        ? "remote PostgreSQL"
        : "unknown PostgreSQL mode";

  console.info(
    `[runtime] env=${summary.nodeEnv} bind=${summary.backendBinding.host}:${summary.backendBinding.port} networkUrl=${summary.backendUrls.networkUrl ?? "disabled"} db=${summary.database.provider} mode=${dbModeLabel} host=${summary.database.host}:${summary.database.port} database=${summary.database.database} ai=${summary.aiService.provider}:${summary.aiService.model} configured=${summary.aiService.configured} authCookie=${summary.authCookie}`
  );

  if (summary.database.mode !== "local") {
    console.warn(
      "[runtime] DATABASE_URL is not pointing at a local PostgreSQL host. For the graduation demo, keep PostgreSQL backend-only on the laptop unless you intentionally moved it."
    );
  }

  if (!summary.backendBinding.networkReachable) {
    console.info(
      "[runtime] Backend is bound to localhost only. Use `npm run dev:network` or `npm run start:network` when the phone needs to reach the laptop over Wi-Fi."
    );
  } else if (!summary.preferredLocalIpv4) {
    console.warn(
      "[runtime] Backend is network-reachable, but no private IPv4 address was detected. Confirm the laptop is connected to the demo network."
    );
  }
}
