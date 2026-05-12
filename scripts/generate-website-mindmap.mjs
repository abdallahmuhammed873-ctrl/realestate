import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function walkFiles(dir, predicate) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
      out.push(...walkFiles(fullPath, predicate));
      continue;
    }
    if (predicate(fullPath)) out.push(fullPath);
  }
  return out;
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function routeFromAppPageFile(filePath) {
  const rel = toPosix(path.relative(path.join(projectRoot, "app"), filePath));
  if (/^page\.(t|j)sx?$/i.test(rel)) return "/";
  const without = rel.replace(/\/page\.(t|j)sx?$/i, "");
  if (without === "page" || without === "") return "/";
  return "/" + without;
}

function routeFromApiRouteFile(filePath) {
  const rel = toPosix(path.relative(path.join(projectRoot, "app/api"), filePath));
  const without = rel.replace(/\/route\.ts$/i, "");
  return "/api/" + without;
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extractMethodsFromRouteFile(source) {
  const methods = new Set();
  const re = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
  let match;
  while ((match = re.exec(source))) methods.add(match[1]);
  const re2 = /export\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
  while ((match = re2.exec(source))) methods.add(match[1]);
  return [...methods];
}

function extractDefaultExportName(source) {
  const direct = source.match(/export\s+default\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)\b/);
  if (direct) return direct[1];
  const inline = source.match(/export\s+default\s+([A-Za-z0-9_]+)\s*;?/);
  if (inline) return inline[1];
  return "default";
}

function extractImports(source) {
  const imports = [];
  const re = /import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];?/g;
  let match;
  while ((match = re.exec(source))) {
    const clause = match[1].trim();
    const from = match[2].trim();
    imports.push({ clause, from });
  }
  return imports;
}

function extractImportNames(clause) {
  // Handles:
  // - defaultImport
  // - { A, B as C }
  // - defaultImport, { A, B as C }
  // - * as NS
  const names = [];
  const parts = clause.split(",").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.startsWith("{") && part.endsWith("}")) {
      const inner = part.slice(1, -1).trim();
      if (!inner) continue;
      for (const raw of inner.split(",").map((x) => x.trim()).filter(Boolean)) {
        const asMatch = raw.match(/^([A-Za-z0-9_]+)\s+as\s+([A-Za-z0-9_]+)$/);
        names.push(asMatch ? asMatch[2] : raw);
      }
      continue;
    }
    const nsMatch = part.match(/^\*\s+as\s+([A-Za-z0-9_]+)$/);
    if (nsMatch) {
      names.push(nsMatch[1]);
      continue;
    }
    names.push(part);
  }
  return names.filter((n) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(n));
}

function classifyApiArea(apiRoute) {
  if (apiRoute.startsWith("/api/auth/")) return "Auth";
  if (apiRoute.startsWith("/api/search")) return "Search";
  if (apiRoute.startsWith("/api/properties/")) return "Properties";
  if (apiRoute.startsWith("/api/favorites/")) return "Favorites";
  if (apiRoute.startsWith("/api/compare")) return "Compare";
  if (apiRoute.startsWith("/api/appointments")) return "Appointments";
  if (apiRoute.startsWith("/api/buyer/appointments")) return "Appointments";
  if (apiRoute.startsWith("/api/seller/appointments")) return "Appointments";
  if (apiRoute.startsWith("/api/seller/listings")) return "Seller";
  if (apiRoute.startsWith("/api/seller/users")) return "Seller";
  if (apiRoute.startsWith("/api/admin/")) return "Admin";
  if (apiRoute.startsWith("/api/community")) return "Community";
  if (apiRoute.startsWith("/api/notifications/")) return "Notifications";
  if (apiRoute.startsWith("/api/me")) return "Auth";
  if (apiRoute.startsWith("/api/chat")) return "Chatbot";
  if (apiRoute.startsWith("/api/saved-searches")) return "Saved Search";
  return "Other";
}

function mdEscape(value) {
  return String(value).replaceAll("|", "\\|");
}

function pdfEscape(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function buildPdf({ title, branches }) {
  // One-page, landscape A4 (842x595 points)
  // Simple lines + Helvetica text. No external deps.
  const width = 842;
  const height = 595;

  // Layout: root on top center; branches across the page.
  const root = { text: title, x: width / 2, y: height - 48 };
  const branchCount = branches.length;
  const gutter = 40;
  const usableW = width - gutter * 2;
  const branchXStep = usableW / Math.max(1, branchCount - 1);

  const branchNodes = branches.map((b, idx) => ({
    text: b.text,
    x: gutter + idx * branchXStep,
    y: height - 130,
    items: b.items
  }));

  const commands = [];
  const fontSizeRoot = 16;
  const fontSizeBranch = 11;
  const fontSizeItem = 8.5;

  commands.push("0 0 0 RG"); // stroke black
  commands.push("0 0 0 rg"); // fill black
  commands.push("1 w");

  // Root text
  commands.push("BT");
  commands.push(`/F1 ${fontSizeRoot} Tf`);
  commands.push(`${Math.round(root.x - 120)} ${Math.round(root.y)} Td`);
  commands.push(`(${pdfEscape(root.text)}) Tj`);
  commands.push("ET");

  // Branch lines + labels + items
  for (const b of branchNodes) {
    // line from root to branch
    commands.push(`${Math.round(root.x)} ${Math.round(root.y - 12)} m`);
    commands.push(`${Math.round(b.x)} ${Math.round(b.y + 10)} l`);
    commands.push("S");

    // branch label
    commands.push("BT");
    commands.push(`/F1 ${fontSizeBranch} Tf`);
    commands.push(`${Math.round(b.x - 20)} ${Math.round(b.y)} Td`);
    commands.push(`(${pdfEscape(b.text)}) Tj`);
    commands.push("ET");

    const maxItems = 10;
    const items = b.items.slice(0, maxItems);
    for (let i = 0; i < items.length; i++) {
      const itemY = b.y - 18 - i * 12;
      // connector line
      commands.push(`${Math.round(b.x)} ${Math.round(b.y - 4)} m`);
      commands.push(`${Math.round(b.x)} ${Math.round(itemY + 3)} l`);
      commands.push("S");

      commands.push("BT");
      commands.push(`/F1 ${fontSizeItem} Tf`);
      commands.push(`${Math.round(b.x - 10)} ${Math.round(itemY)} Td`);
      commands.push(`(${pdfEscape("• " + items[i])}) Tj`);
      commands.push("ET");
    }
  }

  const contentStream = commands.join("\n") + "\n";

  // Build minimal PDF with correct xref offsets.
  const objects = [];
  const addObj = (body) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObj("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = addObj("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  const pageId = addObj(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`
  );
  const fontId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const contentId = addObj(`<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}endstream`);

  const header = "%PDF-1.4\n";
  const serialized = [];
  serialized.push(header);

  const offsets = [0];
  let cursor = Buffer.byteLength(header, "utf8");

  for (let i = 0; i < objects.length; i++) {
    offsets.push(cursor);
    const chunk = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    serialized.push(chunk);
    cursor += Buffer.byteLength(chunk, "utf8");
  }

  const xrefStart = cursor;
  let xref = "xref\n0 " + (objects.length + 1) + "\n";
  xref += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    const off = String(offsets[i]).padStart(10, "0");
    xref += `${off} 00000 n \n`;
  }

  const trailer =
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  serialized.push(xref);
  serialized.push(trailer);
  return Buffer.from(serialized.join(""), "utf8");
}

function main() {
  const appDir = path.join(projectRoot, "app");
  const apiDir = path.join(projectRoot, "app", "api");

  const pageFiles = walkFiles(appDir, (p) => /(^|\/)page\.(t|j)sx?$/i.test(toPosix(p)));
  const apiFiles = fs.existsSync(apiDir) ? walkFiles(apiDir, (p) => /(^|\/)route\.ts$/i.test(toPosix(p))) : [];

  const pages = pageFiles
    .map((filePath) => {
      const source = readText(filePath);
      const route = routeFromAppPageFile(filePath);
      const exportName = extractDefaultExportName(source);
      const imports = extractImports(source);
      const componentImports = [];
      for (const imp of imports) {
        const isLocal =
          imp.from.startsWith("@/components/") ||
          imp.from.startsWith("@/app/") ||
          imp.from.includes("/components/") ||
          imp.from.startsWith("./") ||
          imp.from.startsWith("../");
        if (!isLocal) continue;
        const names = extractImportNames(imp.clause);
        for (const name of names) componentImports.push(name);
      }
      return {
        route,
        file: toPosix(path.relative(projectRoot, filePath)),
        exportName,
        blocks: [...new Set(componentImports)].sort()
      };
    })
    .sort((a, b) => a.route.localeCompare(b.route));

  const apis = apiFiles
    .map((filePath) => {
      const source = readText(filePath);
      const route = routeFromApiRouteFile(filePath);
      const methods = extractMethodsFromRouteFile(source).sort();
      return {
        route,
        file: toPosix(path.relative(projectRoot, filePath)),
        methods,
        area: classifyApiArea(route)
      };
    })
    .sort((a, b) => a.route.localeCompare(b.route));

  const apiCount = apis.length;
  const pageCount = pages.length;

  const mindmapMermaid = [
    "mindmap",
    `  root((Cheque & Key Marketplace))`,
    "    Pages",
    "      Public",
    "        / (Home)",
    "        /search",
    "        /p/[id]",
    "        /compare",
    "        /favorites",
    "        /community",
    "        /notifications",
    "        /profile",
    "        /appointments",
    "        /buyer/appointments",
    "        /auth (+ forgot-password, signup)",
    "        /about",
    "      Seller",
    "        /seller/dashboard",
    "        /seller/new (+ payment, thank-you)",
    "        /seller/listings/[id]/edit",
    "        /seller/users",
    "      Admin",
    "        /admin",
    "        /admin/login",
    "        /admin/pending",
    "        /admin/buyers",
    "        /admin/sellers",
    "        /admin/developers",
    "        /admin/listings/[id]",
    "    APIs",
    `      Internal Next.js route handlers (${apiCount})`,
    "        Auth (demo-login, signup, logout, forgot-password)",
    "        Search + compare + favorites",
    "        Listings + approvals (seller/admin)",
    "        Appointments (buyer/seller/admin)",
    "        Community (posts, likes, comments)",
    "        Notifications + profile (/api/me)",
    "        Chatbot (/api/chat)",
    "    Data Layer",
    "      In-memory repository (demo runtime)",
    "      Prisma schema for PostgreSQL (optional DB mode)",
    "      Mock data (seed + demo listings)",
    "    External Services",
    "      SMTP email (nodemailer) for OTP reset",
    "      OpenStreetMap tiles + Leaflet (via unpkg CDN)",
    "      Google Maps link + WhatsApp link"
  ].join("\n");

  const docsDir = path.join(projectRoot, "docs");
  fs.mkdirSync(docsDir, { recursive: true });

  const pagesTable = [
    "| Route | Page file | Main export | Code blocks (imports) |",
    "|---|---|---|---|",
    ...pages.map(
      (p) =>
        `| ${mdEscape(p.route)} | \`${mdEscape(p.file)}\` | \`${mdEscape(p.exportName)}\` | ${p.blocks.length ? p.blocks.map((b) => `\`${mdEscape(b)}\``).join(", ") : "-"} |`
    )
  ].join("\n");

  const apisTable = [
    "| Area | Methods | Endpoint | Route file |",
    "|---|---|---|---|",
    ...apis.map(
      (a) =>
        `| ${mdEscape(a.area)} | ${a.methods.length ? a.methods.map((m) => `\`${m}\``).join(", ") : "-"} | \`${mdEscape(a.route)}\` | \`${mdEscape(a.file)}\` |`
    )
  ].join("\n");

  const apiAreas = [...new Set(apis.map((a) => a.area))].sort();

  const md = [
    "# Website Mind Map (Cheque & Key)",
    "",
    "This file is auto-generated by `scripts/generate-website-mindmap.mjs`.",
    "",
    "## Quick Numbers",
    "",
    `- Pages (App Router): **${pageCount}** (\`app/**/page.tsx\`)`,
    `- Internal APIs: **${apiCount}** (\`app/api/**/route.ts\`)`,
    "- External service integrations used in code: **2** (SMTP email + OpenStreetMap/Leaflet).",
    "",
    "## Mind Map (Mermaid)",
    "",
    "```mermaid",
    mindmapMermaid,
    "```",
    "",
    "## Explanation (How to Read It)",
    "",
    "- **Pages**: what the user sees (public, seller, admin areas).",
    "- **APIs**: Next.js Route Handlers under `/api/*` that pages/components call with `fetch()`.",
    "- **Data Layer**: repository + Prisma schema; in demo runtime the repo is in-memory.",
    "- **External Services**: third-party services used directly (email + map tiles/CDN).",
    "",
    "## Page -> File -> Code Blocks",
    "",
    "\"Code blocks\" here means the main exported page component plus the key imported UI/feature modules used to build the page.",
    "",
    pagesTable,
    "",
    "## API Inventory (Internal Endpoints)",
    "",
    `Grouped areas detected: ${apiAreas.map((a) => `\`${a}\``).join(", ")}`,
    "",
    apisTable,
    "",
    "## Notes",
    "",
    "- `/api/chat` proxies to the local Python AI service, which reads grounded property data from protected Next.js internal AI endpoints backed by PostgreSQL.",
    "- `resend` is listed in dependencies but no usage was detected in source files.",
    ""
  ].join("\n");

  fs.writeFileSync(path.join(docsDir, "website-mindmap.md"), md, "utf8");
  fs.writeFileSync(path.join(docsDir, "website-mindmap.mmd"), mindmapMermaid + "\n", "utf8");

  const pdf = buildPdf({
    title: "Cheque & Key Marketplace - Mind Map",
    branches: [
      { text: "Public Pages", items: ["/", "/search", "/p/[id]", "/compare", "/favorites", "/community", "/profile", "/notifications", "/auth", "/about"] },
      { text: "Seller Pages", items: ["/seller/dashboard", "/seller/new", "/seller/new/payment", "/seller/new/thank-you", "/seller/listings/[id]/edit", "/seller/users"] },
      { text: "Admin Pages", items: ["/admin", "/admin/login", "/admin/pending", "/admin/buyers", "/admin/sellers", "/admin/developers", "/admin/listings/[id]"] },
      { text: "Internal APIs", items: [`${apiCount} route handlers`, "Auth", "Search", "Listings", "Appointments", "Community", "Notifications", "Chatbot"] },
      { text: "Data Layer", items: ["In-memory repository", "Prisma schema (PostgreSQL)", "Mock data + seed"] },
      { text: "External Services", items: ["SMTP email (OTP reset)", "Leaflet (unpkg CDN)", "OpenStreetMap tiles", "Google Maps link", "WhatsApp link"] }
    ]
  });
  fs.writeFileSync(path.join(docsDir, "website-mindmap.pdf"), pdf);
}

main();
