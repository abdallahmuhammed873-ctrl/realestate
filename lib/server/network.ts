import os from "os";
import { loadLocalEnv } from "./load-env.ts";

loadLocalEnv();

const PRIVATE_IPV4_RANGES = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[0-1])\./];
const WIFI_INTERFACE_NAME = /(wi-?fi|wireless|wlan)/i;
const ETHERNET_INTERFACE_NAME = /ethernet/i;
const DEPRIORITIZED_INTERFACE_NAME = /(virtual|vmware|vbox|hyper-v|loopback|docker|bluetooth|tailscale)/i;

export type LocalIpv4Address = {
  interfaceName: string;
  address: string;
  preferred: boolean;
};

function isPrivateIpv4(address: string) {
  return PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(address));
}

function getInterfacePriority(name: string) {
  if (DEPRIORITIZED_INTERFACE_NAME.test(name)) return 3;
  if (WIFI_INTERFACE_NAME.test(name)) return 0;
  if (ETHERNET_INTERFACE_NAME.test(name)) return 1;
  return 2;
}

export function getServerBindingConfig() {
  const host = process.env.APP_HOST?.trim() || "127.0.0.1";
  const port = process.env.PORT?.trim() || "3000";
  const networkReachable = host === "0.0.0.0";

  return {
    host,
    port,
    networkReachable
  };
}

export function getLocalIpv4Addresses(): LocalIpv4Address[] {
  const interfaces = os.networkInterfaces();
  const candidates: Array<LocalIpv4Address & { priority: number }> = [];

  for (const [interfaceName, entries] of Object.entries(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal || !entry.address) continue;
      if (!isPrivateIpv4(entry.address)) continue;

      candidates.push({
        interfaceName,
        address: entry.address,
        preferred: false,
        priority: getInterfacePriority(interfaceName)
      });
    }
  }

  candidates.sort((left, right) => {
    if (left.priority !== right.priority) return left.priority - right.priority;
    return left.interfaceName.localeCompare(right.interfaceName);
  });

  return candidates.map((candidate, index) => ({
    interfaceName: candidate.interfaceName,
    address: candidate.address,
    preferred: index === 0
  }));
}

export function getPreferredLocalIpv4() {
  return getLocalIpv4Addresses().find((entry) => entry.preferred) ?? null;
}

export function getBackendUrls() {
  const binding = getServerBindingConfig();
  const preferredIp = getPreferredLocalIpv4();
  const localUrl = `http://127.0.0.1:${binding.port}`;
  const networkUrl =
    binding.networkReachable && preferredIp ? `http://${preferredIp.address}:${binding.port}` : null;

  return {
    localUrl,
    networkUrl
  };
}
