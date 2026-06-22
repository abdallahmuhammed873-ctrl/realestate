import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getRequestLanguage } from "@/lib/i18n-server";
import { normalizeLanguage } from "@/lib/i18n";
import { createInvestmentPlan } from "@/lib/repository";

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

    const result = await createInvestmentPlan({
      userId,
      language,
      monthlySalary: Number(body.monthlySalary),
      monthlyExpenses: optionalNumber(body.monthlyExpenses),
      currentSavings: optionalNumber(body.currentSavings),
      propertyType: body.propertyType ? String(body.propertyType) : null,
      city: body.city ? String(body.city) : null,
      area: body.area ? String(body.area) : null,
      bedrooms: optionalNumber(body.bedrooms),
      bathrooms: optionalNumber(body.bathrooms),
      preferredPaymentType: body.preferredPaymentType ? String(body.preferredPaymentType) : null,
      riskLevel: body.riskLevel ? String(body.riskLevel) : null,
      notes: body.notes ? String(body.notes) : null
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown investment planner error.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
