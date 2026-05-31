import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { getLanguageDirection, getLocalizedPropertyDescription, getLocalizedPropertyTitle, t } from "../../lib/i18n.ts";
import { issueMobileAccessToken, getMobileAuthenticatedUser } from "../../lib/mobile-auth.ts";
import { toMobilePropertySearchResponse } from "../../lib/mobile-api.ts";
import { findUserForLogin, searchAiReadableProperties, searchProperties, updateListingStatus, verifyUserPassword } from "../../lib/repository.ts";
import { getBackendHealthSnapshot, getDatabaseHealthCheck } from "../../lib/server/health.ts";
import { saveUploadedFiles } from "../../lib/server/local-media.ts";
import { loadLocalEnv } from "../../lib/server/load-env.ts";
import { createOrUpdateSellerListing, deleteSellerListing } from "../../lib/services/listing-service.ts";
import { importRuntimeData } from "../../prisma/import-runtime-data.ts";

loadLocalEnv();

const prisma = new PrismaClient();
const LIVE_BASE_URL = process.env.PHASE14_BASE_URL?.trim() || "";
const SELLER_ID = "u-seller-1";
const ADMIN_ID = "u-admin-1";
const ACCEPTANCE_TITLE = "Phase 14 Acceptance Verification Listing";

type PendingCheck = {
  label: string;
  details: string;
};

type LiveJsonResult = {
  response: Response;
  data: any;
};

type RouteExpectation = {
  route: string;
  cookie: string;
  mustInclude: Array<string | RegExp>;
  description: string;
};

function toPublicAbsolutePath(relativePath: string) {
  return path.join(process.cwd(), "public", relativePath.replace(/^\//, "").replace(/\//g, path.sep));
}

async function assertFileExists(relativePath: string) {
  await fs.access(toPublicAbsolutePath(relativePath));
}

async function createUploadedMediaDrafts() {
  const uploads = await saveUploadedFiles("property", SELLER_ID, [
    new File([Buffer.from("phase14-cover-image")], "phase14-cover.jpg", { type: "image/jpeg" }),
    new File([Buffer.from("phase14-panorama-image")], "phase14-panorama.jpg", { type: "image/jpeg" })
  ]);

  assert.equal(uploads.length, 2, "Expected temporary property uploads to be created.");
  assert.ok(uploads.every((item) => item.path.startsWith("/uploads/tmp/properties/")), "Expected temporary upload paths.");

  return [
    {
      path: uploads[0]!.path,
      kind: "IMAGE" as const,
      label: "Cover",
      altText: "Cover image",
      mimeType: uploads[0]!.mimeType
    },
    {
      path: uploads[1]!.path,
      kind: "PANORAMA_360" as const,
      label: "Living Room Panorama",
      altText: "360 living room panorama",
      mimeType: uploads[1]!.mimeType
    }
  ];
}

async function runOfflineAcceptance() {
  await importRuntimeData(prisma);

  const database = await getDatabaseHealthCheck();
  assert.equal(database.status, "ok", "Expected PostgreSQL to be reachable before acceptance checks start.");

  const mediaDrafts = await createUploadedMediaDrafts();
  const created = await createOrUpdateSellerListing({
    sellerId: SELLER_ID,
    feesPaid: true,
    property: {
      title: ACCEPTANCE_TITLE,
      titleEn: "Phase 14 Acceptance Listing",
      titleAr: "إعلان التحقق للمرحلة 14",
      description: "Acceptance verification listing stored in PostgreSQL.",
      descriptionEn: "Acceptance verification listing stored in PostgreSQL.",
      descriptionAr: "إعلان تحقق مخزن في قاعدة PostgreSQL.",
      projectName: "Acceptance Heights",
      unitCode: "PH14-001",
      transaction: "BUY",
      type: "APARTMENT",
      price: 5150000,
      rentPrice: null,
      currency: "EGP",
      pricePerSqm: 32187,
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 160,
      landArea: null,
      gardenArea: 0,
      roofArea: 85,
      hasGarden: false,
      hasRoof: true,
      lat: 30.0444,
      lng: 31.2357,
      address: "Acceptance Street 14",
      city: "Cairo",
      area: "New Cairo",
      district: "Lotus",
      furnishing: "SEMI",
      paymentType: "INSTALLMENTS",
      completionStatus: "READY",
      amenities: ["Parking", "Security"],
      images: [mediaDrafts[0]!.path],
      media: mediaDrafts.map((item, index) => ({
        id: `draft-${index}`,
        propertyId: "draft-property",
        kind: item.kind,
        path: item.path,
        label: item.label,
        altText: item.altText,
        sortOrder: index,
        mimeType: item.mimeType,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString()
      })),
      installmentDownPayment: 500000,
      installmentYears: 8,
      installmentMonthly: 42000,
      sourceType: "MANUAL",
      sourceFile: null,
      sourceSheet: null
    }
  });

  assert.ok(created, "Expected seller listing creation to succeed.");
  assert.equal(created?.listing.status, "PENDING", "Expected new seller listing to start pending.");
  assert.equal(created?.property.media?.length, 2, "Expected created property to keep two media items.");
  assert.ok(
    created?.property.media?.some((item) => item.kind === "PANORAMA_360"),
    "Expected one uploaded media item to remain a panorama."
  );
  assert.ok(
    created?.property.media?.every((item) => item.path.startsWith(`/uploads/properties/${created.property.id}/`)),
    "Expected uploaded property media to be promoted into the canonical property uploads directory."
  );
  assert.ok(
    created?.property.images.every((imagePath) => imagePath.startsWith(`/uploads/properties/${created.property.id}/`)),
    "Expected property image paths to be stored as local relative paths."
  );
  await Promise.all(created.property.media!.map((item) => assertFileExists(item.path)));

  const approved = await updateListingStatus(created.listing.id, "APPROVED", ADMIN_ID, "Acceptance verified");
  assert.equal(approved?.status, "APPROVED", "Expected admin approval to succeed.");

  const websiteSearch = await searchProperties({ q: ACCEPTANCE_TITLE, page: 1, pageSize: 10 });
  const websiteItem = websiteSearch.items.find((item) => item.id === created.property.id);
  assert.ok(websiteItem, "Expected approved listing to appear in the canonical website search service.");
  assert.equal(websiteItem?.listingStatus, "APPROVED");

  const mobileResponse = toMobilePropertySearchResponse(websiteSearch, "http://127.0.0.1:3000");
  const mobileItem = mobileResponse.items.find((item) => item.id === created.property.id);
  assert.ok(mobileItem, "Expected approved listing to appear in the mobile property DTO response.");
  assert.ok(
    mobileItem?.imageUrls.every((url) => url.startsWith("http://127.0.0.1:3000/uploads/properties/")),
    "Expected mobile image URLs to be absolute."
  );
  assert.ok(
    mobileItem?.media.every((item) => item.url?.startsWith("http://127.0.0.1:3000/uploads/properties/")),
    "Expected mobile media URLs to be absolute."
  );
  assert.ok(
    mobileItem?.media.some((item) => item.kind === "PANORAMA_360"),
    "Expected mobile DTO to expose panorama media."
  );

  const aiReadable = await searchAiReadableProperties({ q: ACCEPTANCE_TITLE, page: 1, pageSize: 10 });
  const aiItem = aiReadable.items.find((item) => item.id === created.property.id);
  assert.ok(aiItem, "Expected AI retrieval to see the same approved property from PostgreSQL.");

  await prisma.property.update({
    where: { id: created.property.id },
    data: { price: 5350000 }
  });

  const [websiteAfterPriceChange, aiAfterPriceChange] = await Promise.all([
    searchProperties({ q: ACCEPTANCE_TITLE, page: 1, pageSize: 10 }),
    searchAiReadableProperties({ q: ACCEPTANCE_TITLE, page: 1, pageSize: 10 })
  ]);
  const mobileAfterPriceChange = toMobilePropertySearchResponse(websiteAfterPriceChange, "http://127.0.0.1:3000");

  assert.equal(
    websiteAfterPriceChange.items.find((item) => item.id === created.property.id)?.price,
    5350000,
    "Expected website search to reflect canonical DB price changes."
  );
  assert.equal(
    mobileAfterPriceChange.items.find((item) => item.id === created.property.id)?.price,
    5350000,
    "Expected mobile DTOs to reflect canonical DB price changes."
  );
  assert.equal(
    aiAfterPriceChange.items.find((item) => item.id === created.property.id)?.price,
    5350000,
    "Expected AI-readable retrieval to reflect canonical DB price changes."
  );

  const seller = await findUserForLogin({ role: "SELLER", identifier: "seller@example.com" });
  assert.ok(seller, "Expected seeded seller account to exist.");
  assert.equal(await verifyUserPassword(seller!.id, "123456"), true, "Expected current password verification to work.");

  const issuedToken = issueMobileAccessToken({ id: seller!.id, role: seller!.role });
  const mobileUser = await getMobileAuthenticatedUser(
    new Request("http://127.0.0.1:3000/api/v1/me", {
      headers: {
        authorization: `Bearer ${issuedToken.accessToken}`
      }
    })
  );
  assert.equal(mobileUser?.id, seller!.id, "Expected bearer tokens to authenticate the mobile-ready API user.");

  assert.equal(getLanguageDirection("en"), "ltr");
  assert.equal(getLanguageDirection("ar"), "rtl");
  assert.notEqual(t("ar", "search"), t("en", "search"), "Expected Arabic and English UI labels to differ.");
  assert.equal(
    getLocalizedPropertyTitle(created.property, "ar"),
    "إعلان التحقق للمرحلة 14",
    "Expected Arabic property title retrieval to prefer the Arabic field."
  );
  assert.equal(
    getLocalizedPropertyDescription(created.property, "en"),
    "Acceptance verification listing stored in PostgreSQL.",
    "Expected English property description retrieval to prefer the English field."
  );

  return created;
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => null);
  return { response, data };
}

async function fetchText(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  return { response, text };
}

function getSetCookieValues(response: Response) {
  const header = response.headers.get("set-cookie");
  if (!header) return [];
  return header
    .split(/,(?=\s*[^;=]+=[^;]+)/)
    .map((value) => value.trim())
    .filter(Boolean);
}

async function assertRouteMatches(baseUrl: string, expectation: RouteExpectation) {
  const result = await fetchText(`${baseUrl}${expectation.route}`, {
    headers: {
      Cookie: expectation.cookie
    }
  });

  assert.equal(result.response.ok, true, `Expected ${expectation.description} to render successfully.`);
  for (const pattern of expectation.mustInclude) {
    if (typeof pattern === "string") {
      assert.match(
        result.text,
        new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        `Expected ${expectation.description} to include "${pattern}".`
      );
    } else {
      assert.match(result.text, pattern, `Expected ${expectation.description} to match ${pattern}.`);
    }
  }
}

async function assertNetworkBaseUrl(networkBaseUrl: string, propertyTitle: string, propertyId: string) {
  const health = await fetchJson(`${networkBaseUrl}/api/health`);
  assert.ok(
    health.response.status === 200 || health.response.status === 503,
    "Expected the network-facing health endpoint to respond over the laptop IPv4 URL."
  );

  const properties = await fetchJson(
    `${networkBaseUrl}/api/v1/properties?q=${encodeURIComponent(propertyTitle)}&page=1&pageSize=10`
  );
  assert.equal(properties.response.ok, true, "Expected the network-facing properties endpoint to respond successfully.");

  const property = properties.data?.items?.find((item: { id?: string }) => item.id === propertyId);
  assert.ok(property, "Expected the acceptance listing to be reachable through the network-facing properties endpoint.");
  assert.ok(
    property.imageUrls?.every((url: string) => url.startsWith(networkBaseUrl)),
    "Expected network-facing property image URLs to use the laptop IPv4 backend origin."
  );
  assert.ok(
    property.media?.every((item: { url?: string | null }) => !item.url || item.url.startsWith(networkBaseUrl)),
    "Expected network-facing property media URLs to use the laptop IPv4 backend origin."
  );

  const firstMediaUrl = property.media?.find((item: { url?: string | null }) => item.url)?.url || property.imageUrls?.[0];
  assert.ok(firstMediaUrl, "Expected at least one network-facing media URL for the acceptance listing.");
  const media = await fetch(firstMediaUrl);
  assert.equal(media.ok, true, "Expected the laptop IPv4 backend origin to serve uploaded media files.");
}

async function runLiveAcceptance(baseUrl: string, propertyId: string, propertyTitle: string): Promise<PendingCheck[]> {
  const pending: PendingCheck[] = [];
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  const health: LiveJsonResult = await fetchJson(`${normalizedBaseUrl}/api/health`);
  assert.ok(
    health.response.status === 200 || health.response.status === 503,
    "Expected the live backend health endpoint to respond with either ok or degraded status."
  );
  assert.ok(health.data?.backend, "Expected the live backend health endpoint to return a backend snapshot.");
  assert.equal(health.data?.database?.status, "ok", "Expected the live backend to reach PostgreSQL.");

  const login = await fetchJson(`${normalizedBaseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "buyer@example.com",
      password: "123456"
    })
  });
  assert.equal(login.response.ok, true, "Expected mobile login to succeed through the live versioned API.");
  assert.ok(login.data?.accessToken, "Expected mobile login to return a bearer token.");

  const me = await fetchJson(`${normalizedBaseUrl}/api/v1/me`, {
    headers: {
      authorization: `Bearer ${login.data.accessToken}`
    }
  });
  assert.equal(me.response.ok, true, "Expected /api/v1/me to accept the issued bearer token.");
  assert.equal(me.data?.user?.email, "buyer@example.com");

  const webLogin = await fetch(`${normalizedBaseUrl}/api/auth/demo-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "buyer@example.com",
      password: "123456",
      role: "BUYER"
    })
  });
  assert.equal(webLogin.ok, true, "Expected the current web auth login route to succeed.");
  const authCookie = getSetCookieValues(webLogin).find((value) => value.startsWith("demo_user_id="));
  assert.ok(authCookie, "Expected the web auth login route to set the session cookie.");

  const sellerWebLogin = await fetch(`${normalizedBaseUrl}/api/auth/demo-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "seller@example.com",
      password: "123456",
      role: "SELLER"
    })
  });
  assert.equal(sellerWebLogin.ok, true, "Expected seller web login to succeed for the seller listing page verification.");
  const sellerAuthCookie = getSetCookieValues(sellerWebLogin).find((value) => value.startsWith("demo_user_id="));
  assert.ok(sellerAuthCookie, "Expected seller web login to set the session cookie.");

  const webMe = await fetchJson(`${normalizedBaseUrl}/api/me`, {
    headers: {
      Cookie: authCookie!.split(";")[0]!
    }
  });
  assert.equal(webMe.response.ok, true, "Expected /api/me to accept the current session-cookie auth flow.");
  assert.equal(webMe.data?.user?.role, "BUYER", "Expected /api/me to return the active session role.");

  const properties = await fetchJson(
    `${normalizedBaseUrl}/api/v1/properties?q=${encodeURIComponent(propertyTitle)}&page=1&pageSize=10`
  );
  assert.equal(properties.response.ok, true, "Expected the live mobile properties endpoint to respond successfully.");
  const property = properties.data?.items?.find((item: { title?: string }) => item.title === propertyTitle);
  assert.ok(property, "Expected the verified acceptance listing to appear in the live mobile properties endpoint.");
  assert.ok(
    property.imageUrls?.every((url: string) => url.startsWith(normalizedBaseUrl)),
    "Expected live mobile property images to resolve to absolute backend URLs."
  );

  const firstMediaUrl = property.media?.[0]?.url || property.imageUrls?.[0];
  if (firstMediaUrl) {
    const media = await fetch(firstMediaUrl);
    assert.equal(media.ok, true, "Expected the live backend to serve property media files.");
  }

  await Promise.all([
    assertRouteMatches(normalizedBaseUrl, {
      route: "/",
      cookie: "site-language=en; site-theme=light",
      mustInclude: [/lang="en"/, /dir="ltr"/, /site-theme/, /AI Assistant/, /Find verified properties/],
      description: "the English homepage"
    }),
    assertRouteMatches(normalizedBaseUrl, {
      route: "/",
      cookie: "site-language=ar; site-theme=dark",
      mustInclude: [/lang="ar"/, /dir="rtl"/, /site-language/, /المساعد الذكي/, /اعثر على عقارات موثقة/],
      description: "the Arabic homepage"
    }),
    assertRouteMatches(normalizedBaseUrl, {
      route: `/search?q=${encodeURIComponent(propertyTitle)}`,
      cookie: "site-language=en; site-theme=dark",
      mustInclude: [/lang="en"/, /dir="ltr"/, /site-theme/, /Filters/, /listings found/],
      description: "the English search page"
    }),
    assertRouteMatches(normalizedBaseUrl, {
      route: `/search?q=${encodeURIComponent(propertyTitle)}`,
      cookie: "site-language=ar; site-theme=dark",
      mustInclude: [/lang="ar"/, /dir="rtl"/, /site-theme/, /الفلاتر/, /عقار مطابق/],
      description: "the Arabic search page"
    }),
    assertRouteMatches(normalizedBaseUrl, {
      route: `/p/${propertyId}`,
      cookie: "site-language=en; site-theme=light",
      mustInclude: [/lang="en"/, /dir="ltr"/, /site-theme/, new RegExp(`/uploads/properties/${propertyId}/`)],
      description: "the English property page"
    }),
    assertRouteMatches(normalizedBaseUrl, {
      route: "/seller/new",
      cookie: `${sellerAuthCookie!.split(";")[0]!}; site-language=en; site-theme=dark`,
      mustInclude: [/lang="en"/, /dir="ltr"/, /site-theme/, /Create Listing/],
      description: "the seller listing wizard page"
    }),
    assertRouteMatches(normalizedBaseUrl, {
      route: "/seller/new",
      cookie: `${sellerAuthCookie!.split(";")[0]!}; site-language=ar; site-theme=dark`,
      mustInclude: [/lang="ar"/, /dir="rtl"/, /site-theme/, /إنشاء إعلان/],
      description: "the Arabic seller listing wizard page"
    })
  ]);

  if (health.data?.aiService?.status === "ok") {
    const chat = await fetchJson(`${normalizedBaseUrl}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Show me details about unit PH14-001",
        language: "EN"
      })
    });
    assert.equal(chat.response.ok, true, "Expected the live AI chat proxy to succeed when the AI service is healthy.");
    assert.ok(
      chat.data?.items?.some((item: { id?: string }) => item.id === property.id),
      "Expected live AI chat grounding to return the same canonical property."
    );

    const arabicChat = await fetchJson(`${normalizedBaseUrl}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "unit PH14-001",
        language: "AR"
      })
    });
    assert.equal(arabicChat.response.ok, true, "Expected the live AI chat proxy to support Arabic responses.");
    assert.equal(arabicChat.data?.language, "AR", "Expected the live AI chat response to preserve the requested language.");
    assert.match(
      arabicChat.data?.reply ?? "",
      /[\u0600-\u06FF]/,
      "Expected the Arabic AI reply to contain Arabic text."
    );
  } else {
    pending.push({
      label: "Live AI answer verification",
      details: "The backend health endpoint reported Gemini AI as unavailable, so /api/v1/chat was not asserted."
    });
  }

  const networkUrl = typeof health.data?.backend?.urls?.networkUrl === "string" ? health.data.backend.urls.networkUrl.replace(/\/+$/, "") : "";
  const networkReachable = Boolean(health.data?.backend?.binding?.networkReachable);

  if (networkReachable && networkUrl) {
    await assertNetworkBaseUrl(networkUrl, propertyTitle, propertyId);
  } else {
    pending.push({
      label: "Same-network laptop IPv4 verification",
      details:
        "The backend was not reporting a reachable network URL. Start the app with `npm run dev:network` or `npm run start:network`, then rerun the acceptance check against the laptop IPv4 URL."
    });
  }

  return pending;
}

async function main() {
  const pendingChecks: PendingCheck[] = [];
  const created = await runOfflineAcceptance();

  if (LIVE_BASE_URL) {
    pendingChecks.push(...(await runLiveAcceptance(LIVE_BASE_URL, created.property.id, ACCEPTANCE_TITLE)));
  } else {
    pendingChecks.push({
      label: "Live backend/API verification",
      details:
        "Set PHASE14_BASE_URL to a running backend URL to verify /api/health, /api/v1/auth/login, /api/v1/me, /api/v1/properties, media serving, and optionally /api/v1/chat."
    });
  }

  const backendHealth = await getBackendHealthSnapshot();
  if (backendHealth.aiService.status !== "ok") {
    pendingChecks.push({
      label: "Gemini AI configuration",
      details: backendHealth.aiService.details || "Gemini AI was not configured for this workspace run."
    });
  }

  console.log("Phase 14 acceptance verification passed for the offline PostgreSQL-backed scenarios.");
  if (pendingChecks.length > 0) {
    console.log("Pending live/manual checks:");
    for (const check of pendingChecks) {
      console.log(`- ${check.label}: ${check.details}`);
    }
  }

  if (created) {
    await deleteSellerListing(created.listing.id, SELLER_ID);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
