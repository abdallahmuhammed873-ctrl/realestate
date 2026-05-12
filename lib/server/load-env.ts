import fs from "fs";
import path from "path";

let loaded = false;

export function loadLocalEnv() {
  if (loaded) return;
  loaded = true;

  for (const fileName of [".env.local", ".env"]) {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 0) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^"(.*)"$/, "$1");
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}
