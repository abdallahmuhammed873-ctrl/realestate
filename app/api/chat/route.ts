import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const language = body.language === "AR" ? "AR" : "EN";
  const message = String(body.message ?? "").toLowerCase();
  const reply =
    language === "AR"
      ? "ممتاز. ما الميزانية؟ شراء أم إيجار؟ وأي منطقة تفضلها؟"
      : message.includes("rent")
        ? "Great. What monthly budget and preferred district should I target?"
        : "Great. What is your budget, transaction type (buy/rent), and preferred location?";
  return NextResponse.json({
    reply,
    suggestedFilters: ["transaction", "minPrice", "maxPrice", "city", "area", "beds"],
    language
  });
}
