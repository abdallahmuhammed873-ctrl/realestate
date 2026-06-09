import { NextRequest, NextResponse } from "next/server";
import { aiLanguageSchema } from "@/lib/ai-contract";
import { createLiveEphemeralSession } from "@/lib/server/ai-live-service";

export async function POST(req: NextRequest) {
  const rawBody = await req.json().catch(() => ({}));
  const language = aiLanguageSchema.catch("EN").parse((rawBody as { language?: unknown }).language);

  try {
    const session = await createLiveEphemeralSession(language);
    return NextResponse.json(session);
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown Live API session error.";
    if (process.env.NODE_ENV !== "production") {
      console.error("[AI Live] session creation failed", details);
    }
    return NextResponse.json(
      {
        error: "Unable to start the live voice assistant.",
        details
      },
      { status: 500 }
    );
  }
}
