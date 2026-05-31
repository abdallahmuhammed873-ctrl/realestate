import { getServerRuntimeSummary } from "../lib/server/runtime-config.ts";
import { getLocalIpv4Addresses } from "../lib/server/network.ts";

const summary = getServerRuntimeSummary();
const addresses = getLocalIpv4Addresses();

console.log("Unified Real Estate Platform network summary");
console.log(`Backend bind host: ${summary.backendBinding.host}`);
console.log(`Backend port: ${summary.backendBinding.port}`);
console.log(`Backend localhost URL: ${summary.backendUrls.localUrl}`);
console.log(`Backend network URL: ${summary.backendUrls.networkUrl ?? "not available"}`);
console.log(`AI service: ${summary.aiService.provider}:${summary.aiService.model}`);
console.log(`AI configured: ${summary.aiService.configured ? "yes" : "no"}`);
console.log(`Database host: ${summary.database.host}:${summary.database.port}`);
console.log("Detected private IPv4 addresses:");

if (!addresses.length) {
  console.log("- none detected");
} else {
  for (const address of addresses) {
    console.log(`- ${address.address} (${address.interfaceName})${address.preferred ? " [preferred]" : ""}`);
  }
}
