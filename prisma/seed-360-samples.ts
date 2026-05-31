import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { loadLocalEnv } from "../lib/server/load-env.ts";

loadLocalEnv();

const prisma = new PrismaClient();

const SAMPLE_SELLER_EMAIL = "seller.360.demo@chequekey.local";
const SAMPLE_SELLER_ID = "sample-360-seller";
const PUBLIC_SAMPLE_DIR = path.join(process.cwd(), "public", "samples", "360");
const PUBLIC_SAMPLE_PATH = "/samples/360";
const SVG_MIME = "image/svg+xml";
const PNG_MIME = "image/png";

type SampleAsset = {
  path: string;
  mimeType: string;
};

type SampleMedia = {
  kind: "IMAGE" | "PANORAMA_360" | "SPIN_360_FRAME";
  path: string;
  label: string;
  altText: string;
  sortOrder: number;
  mimeType: string;
};

function svg(width: number, height: number, body: string) {
  const cleanedBody = body
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">\n${cleanedBody}\n</svg>\n`;
}

function label(text: string, x: number, y: number, size = 52, fill = "#f8fafc") {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Arial, sans-serif" font-size="${size}" font-weight="700">${text}</text>`;
}

function makeCoverSvg(title: string, subtitle: string, color: string) {
  return svg(
    1200,
    800,
    `
    <defs>
      <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${color}"/>
        <stop offset="100%" stop-color="#101827"/>
      </linearGradient>
      <linearGradient id="floor" x1="0" x2="1">
        <stop offset="0%" stop-color="#d7b46a"/>
        <stop offset="100%" stop-color="#8f6e38"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#sky)"/>
    <rect x="0" y="560" width="1200" height="240" fill="url(#floor)"/>
    <rect x="90" y="110" width="390" height="300" rx="28" fill="#f8fafc" opacity="0.92"/>
    <rect x="535" y="110" width="575" height="300" rx="28" fill="#f8fafc" opacity="0.34"/>
    <rect x="170" y="460" width="330" height="110" rx="28" fill="#223047"/>
    <rect x="620" y="470" width="310" height="96" rx="26" fill="#244c5a"/>
    <circle cx="990" cy="520" r="58" fill="#d7b46a"/>
    ${label(title, 90, 690, 56)}
    ${label(subtitle, 92, 745, 32, "#d9e4ea")}
  `
  );
}

function makeSpinFrameSvg(index: number, total: number) {
  const angle = Math.round((index / total) * 360);
  const radians = (angle * Math.PI) / 180;
  const sofaX = Math.round(520 + Math.sin(radians) * 130);
  const tableX = Math.round(590 + Math.cos(radians) * 180);
  const artX = Math.round(530 + Math.sin(radians + 1.4) * 210);
  const wallColors = ["#16323b", "#1f3d42", "#29444a", "#35464e", "#3f4851", "#34414c"];
  const wall = wallColors[index % wallColors.length];

  return svg(
    1200,
    800,
    `
    <defs>
      <linearGradient id="floor" x1="0" x2="1">
        <stop offset="0%" stop-color="#c79852"/>
        <stop offset="100%" stop-color="#735124"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="${wall}"/>
    <rect x="0" y="540" width="1200" height="260" fill="url(#floor)"/>
    <rect x="${artX}" y="120" width="220" height="150" rx="18" fill="#f8fafc" opacity="0.82"/>
    <circle cx="${artX + 72}" cy="194" r="42" fill="#d7b46a"/>
    <rect x="${sofaX}" y="405" width="420" height="118" rx="36" fill="#244c5a"/>
    <rect x="${sofaX + 32}" y="354" width="150" height="82" rx="24" fill="#2e6f7f"/>
    <rect x="${sofaX + 226}" y="354" width="150" height="82" rx="24" fill="#2e6f7f"/>
    <ellipse cx="${tableX}" cy="610" rx="160" ry="54" fill="#111827" opacity="0.78"/>
    <circle cx="${tableX + 20}" cy="592" r="28" fill="#d7b46a"/>
    <rect x="0" y="0" width="1200" height="84" fill="#020617" opacity="0.48"/>
    ${label("360 spin sample", 40, 56, 36)}
    ${label(`Frame ${index + 1} / ${total} - ${angle} deg`, 820, 56, 34, "#cbd5e1")}
  `
  );
}

async function writeAsset(fileName: string, content: string): Promise<SampleAsset> {
  await fs.mkdir(PUBLIC_SAMPLE_DIR, { recursive: true });
  await fs.writeFile(path.join(PUBLIC_SAMPLE_DIR, fileName), content, "utf8");
  return {
    path: `${PUBLIC_SAMPLE_PATH}/${fileName}`,
    mimeType: SVG_MIME
  };
}

async function existingPngAsset(fileName: string): Promise<SampleAsset> {
  await fs.access(path.join(PUBLIC_SAMPLE_DIR, fileName));
  return {
    path: `${PUBLIC_SAMPLE_PATH}/${fileName}`,
    mimeType: PNG_MIME
  };
}

async function createAssets() {
  const panoramaCover = await writeAsset(
    "sample-360-panorama-cover.svg",
    makeCoverSvg("360 Demo Sky Apartment", "Approved sample with two panorama rooms", "#2e6f7f")
  );
  const spinCover = await writeAsset(
    "sample-360-spin-cover.svg",
    makeCoverSvg("360 Demo Villa Spin Tour", "Approved sample with panorama and spin frames", "#5b6f95")
  );
  const livingPanorama = await existingPngAsset("sample-360-living-panorama.png");
  const bedroomPanorama = await existingPngAsset("sample-360-bedroom-panorama.png");
  const villaPanorama = await existingPngAsset("sample-360-villa-panorama.png");
  const spinFrames = await Promise.all(
    Array.from({ length: 12 }, (_, index) => writeAsset(`sample-360-spin-frame-${String(index + 1).padStart(2, "0")}.svg`, makeSpinFrameSvg(index, 12)))
  );

  return {
    panoramaCover,
    spinCover,
    livingPanorama,
    bedroomPanorama,
    villaPanorama,
    spinFrames
  };
}

async function upsertSampleSeller() {
  return prisma.user.upsert({
    where: { email: SAMPLE_SELLER_EMAIL },
    update: {
      name: "360 Demo Seller",
      role: "SELLER",
      blocked: false,
      phone: "+201000003600"
    },
    create: {
      id: SAMPLE_SELLER_ID,
      name: "360 Demo Seller",
      email: SAMPLE_SELLER_EMAIL,
      phone: "+201000003600",
      role: "SELLER",
      blocked: false
    }
  });
}

async function upsertApprovedListing(listingId: string, sellerId: string) {
  return prisma.listing.upsert({
    where: { id: listingId },
    update: {
      userId: sellerId,
      status: "APPROVED",
      feesPaid: true,
      adminNotes: "Seeded 360 sample listing.",
      reviewedAt: new Date()
    },
    create: {
      id: listingId,
      userId: sellerId,
      status: "APPROVED",
      feesPaid: true,
      adminNotes: "Seeded 360 sample listing.",
      reviewedAt: new Date()
    }
  });
}

async function replaceMedia(propertyId: string, media: SampleMedia[]) {
  await prisma.propertyMedia.deleteMany({ where: { propertyId } });
  await prisma.propertyMedia.createMany({
    data: media.map((item) => ({
      propertyId,
      kind: item.kind,
      path: item.path,
      label: item.label,
      altText: item.altText,
      sortOrder: item.sortOrder,
      mimeType: item.mimeType
    }))
  });
}

async function upsertProperty(input: {
  listingId: string;
  propertyId: string;
  title: string;
  description: string;
  projectName: string;
  unitCode: string;
  transaction: "BUY" | "RENT";
  type: "APARTMENT" | "VILLA";
  price: number | null;
  rentPrice: number | null;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  district: string;
  address: string;
  cover: SampleAsset;
  media: SampleMedia[];
}) {
  const commonData = {
    title: input.title,
    titleEn: input.title,
    titleAr: input.title,
    description: input.description,
    descriptionEn: input.description,
    descriptionAr: input.description,
    projectName: input.projectName,
    unitCode: input.unitCode,
    inventoryStatus: "360_SAMPLE",
    transaction: input.transaction,
    type: input.type,
    price: input.price,
    rentPrice: input.rentPrice,
    currency: "EGP",
    pricePerSqm: input.price ? Math.round(input.price / input.areaSqm) : null,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    areaSqm: input.areaSqm,
    landArea: input.type === "VILLA" ? 420 : null,
    gardenArea: input.type === "VILLA" ? 120 : 0,
    roofArea: input.type === "VILLA" ? 80 : 0,
    hasGarden: input.type === "VILLA",
    hasRoof: input.type === "VILLA",
    lat: 30.0284,
    lng: 31.4913,
    address: input.address,
    city: "Cairo",
    area: "New Cairo",
    district: input.district,
    furnishing: "SEMI" as const,
    paymentType: "INSTALLMENTS" as const,
    completionStatus: "READY" as const,
    amenities: ["360 Tour", "Security", "Parking", "Clubhouse"],
    images: [input.cover.path],
    installmentDownPayment: input.price ? Math.round(input.price * 0.1) : null,
    installmentYears: input.price ? 7 : null,
    installmentMonthly: input.price ? Math.round((input.price * 0.9) / (7 * 12)) : null,
    sourceType: "MANUAL" as const,
    sourceFile: "seed-360-samples",
    sourceSheet: "360 Samples"
  };

  await prisma.property.upsert({
    where: { id: input.propertyId },
    update: {
      ...commonData,
      listing: { connect: { id: input.listingId } }
    },
    create: {
      id: input.propertyId,
      ...commonData,
      listing: { connect: { id: input.listingId } }
    }
  });

  await replaceMedia(input.propertyId, [
    {
      kind: "IMAGE",
      path: input.cover.path,
      label: "Cover",
      altText: `${input.title} cover image`,
      sortOrder: 0,
      mimeType: input.cover.mimeType
    },
    ...input.media
  ]);
}

async function main() {
  const assets = await createAssets();
  const seller = await upsertSampleSeller();

  await upsertApprovedListing("sample-360-panorama-listing", seller.id);
  await upsertProperty({
    listingId: "sample-360-panorama-listing",
    propertyId: "sample-360-panorama-property",
    title: "360 Demo Sky Apartment",
    description: "Approved demo apartment with two interactive panorama views for testing the 360 gallery.",
    projectName: "Cheque Key 360 Demo",
    unitCode: "360-APT-01",
    transaction: "BUY",
    type: "APARTMENT",
    price: 4850000,
    rentPrice: null,
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 168,
    district: "Fifth Settlement",
    address: "360 Demo Street, Fifth Settlement",
    cover: assets.panoramaCover,
    media: [
      {
        kind: "PANORAMA_360",
        path: assets.livingPanorama.path,
        label: "Living Room 360",
        altText: "360 panorama sample for the living room",
        sortOrder: 1,
        mimeType: assets.livingPanorama.mimeType
      },
      {
        kind: "PANORAMA_360",
        path: assets.bedroomPanorama.path,
        label: "Bedroom 360",
        altText: "360 panorama sample for the bedroom",
        sortOrder: 2,
        mimeType: assets.bedroomPanorama.mimeType
      }
    ]
  });

  await upsertApprovedListing("sample-360-spin-listing", seller.id);
  await upsertProperty({
    listingId: "sample-360-spin-listing",
    propertyId: "sample-360-spin-property",
    title: "360 Demo Villa Spin Tour",
    description: "Approved demo villa with one panorama and ordered 360 spin frames for testing drag, arrows, and slider navigation.",
    projectName: "Cheque Key 360 Demo",
    unitCode: "360-VIL-01",
    transaction: "BUY",
    type: "VILLA",
    price: 9250000,
    rentPrice: null,
    bedrooms: 4,
    bathrooms: 4,
    areaSqm: 310,
    district: "Golden Square",
    address: "360 Demo Villa Lane, Golden Square",
    cover: assets.spinCover,
    media: [
      {
        kind: "PANORAMA_360",
        path: assets.villaPanorama.path,
        label: "Reception 360",
        altText: "360 panorama sample for the villa reception",
        sortOrder: 1,
        mimeType: assets.villaPanorama.mimeType
      },
      ...assets.spinFrames.map((asset, index) => ({
        kind: "SPIN_360_FRAME" as const,
        path: asset.path,
        label: `Spin frame ${index + 1}`,
        altText: `360 spin sample frame ${index + 1}`,
        sortOrder: index + 2,
        mimeType: asset.mimeType
      }))
    ]
  });

  const port = process.env.PORT?.trim() || "3000";
  console.log("360 sample assets written to public/samples/360");
  console.log("360 sample properties are approved and ready:");
  console.log(`- http://127.0.0.1:${port}/p/sample-360-panorama-property`);
  console.log(`- http://127.0.0.1:${port}/p/sample-360-spin-property`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
