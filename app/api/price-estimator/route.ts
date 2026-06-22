import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getRequestLanguage } from "@/lib/i18n-server";
import { normalizeLanguage } from "@/lib/i18n";
import { createPriceEstimate, trackAnalyticsEvent } from "@/lib/repository";

function optionalNumber(value: unknown) {
  if (value === "" || value == null) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ ok: false, message: "Login required." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const language = body.language ? normalizeLanguage(String(body.language)) : await getRequestLanguage();

    const result = await createPriceEstimate({
      userId,
      language,
      propertyType: String(body.propertyType ?? ""),
      city: String(body.city ?? ""),
      area: body.area ? String(body.area) : null,
      district: body.district ? String(body.district) : null,
      areaSqm: Number(body.areaSqm),
      bedrooms: optionalNumber(body.bedrooms),
      bathrooms: optionalNumber(body.bathrooms),
      furnishing: body.furnishing ? String(body.furnishing) : null,
      completionStatus: body.completionStatus ? String(body.completionStatus) : null,
      paymentType: body.paymentType ? String(body.paymentType) : null
    });

    if (!result.ok) {
      await trackAnalyticsEvent({
        userId,
        eventType: "PRICE_ESTIMATE",
        metadata: {
          success: false,
          reason: result.message,
          propertyType: String(body.propertyType ?? ""),
          city: String(body.city ?? "")
        }
      });
    }

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown price estimator error.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
