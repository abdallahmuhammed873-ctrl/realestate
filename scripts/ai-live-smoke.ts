import { GoogleGenAI } from "@google/genai";
import type { FunctionCall, LiveConnectConfig, Session } from "@google/genai";
import { loadLocalEnv } from "../lib/server/load-env.ts";
import {
  createLiveEphemeralSession,
  searchLiveExternalMarket,
  searchLivePlatformProperties
} from "../lib/server/ai-live-service.ts";

type LiveSessionSmoke = {
  token: string;
  model: string;
  config: LiveConnectConfig;
};

function mergeTranscript(previous: string, next: string) {
  const cleaned = next.trim();
  if (!cleaned) return previous;
  if (!previous) return cleaned;
  if (cleaned.startsWith(previous)) return cleaned;
  if (previous.endsWith(cleaned)) return previous;
  return `${previous}${previous.endsWith(" ") ? "" : " "}${cleaned}`;
}

async function runToolCall(call: FunctionCall) {
  const query = typeof call.args?.query === "string" ? call.args.query : "buy apartment in New Cairo under 5 million";

  if (call.name === "search_platform_properties") {
    const output = await searchLivePlatformProperties(query);
    return {
      response: {
        id: call.id,
        name: call.name,
        response: { output }
      },
      itemCount: output.items.length,
      sourceCount: 0
    };
  }

  if (call.name === "search_external_market") {
    const output = await searchLiveExternalMarket(query, "EN");
    return {
      response: {
        id: call.id,
        name: call.name,
        response: { output }
      },
      itemCount: 0,
      sourceCount: output.sources.length
    };
  }

  return {
    response: {
      id: call.id,
      name: call.name,
      response: { error: `Unsupported smoke-test tool: ${call.name || "unknown"}` }
    },
    itemCount: 0,
    sourceCount: 0
  };
}

async function runLiveTextTurn(sessionInfo: LiveSessionSmoke) {
  const ai = new GoogleGenAI({
    apiKey: sessionInfo.token,
    httpOptions: { apiVersion: "v1alpha" }
  });
  let liveSession: Session | null = null;
  let outputTranscript = "";
  let toolCalls = 0;
  let returnedItems = 0;
  let returnedSources = 0;
  let promptSent = false;
  let setupComplete = false;

  function sendPrompt() {
    if (!liveSession || promptSent) return;
    promptSent = true;
    liveSession.sendClientContent({
      turns: {
        role: "user",
        parts: [{ text: "Find apartments for sale in New Cairo under 5 million EGP." }]
      },
      turnComplete: true
    });
  }

  return await new Promise<{ outputLength: number; toolCalls: number; returnedItems: number; returnedSources: number }>(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      liveSession?.close();
      reject(new Error("Gemini Live text turn smoke test timed out."));
    }, 60_000);

    try {
      liveSession = await ai.live.connect({
        model: sessionInfo.model,
        config: sessionInfo.config,
        callbacks: {
          onmessage: (message) => {
            if (message.setupComplete) {
              setupComplete = true;
              sendPrompt();
            }

            const outputText = message.serverContent?.outputTranscription?.text || message.text || "";
            if (outputText) outputTranscript = mergeTranscript(outputTranscript, outputText);

            const calls = message.toolCall?.functionCalls ?? [];
            if (calls.length > 0 && liveSession) {
              toolCalls += calls.length;
              void Promise.all(calls.map((call) => runToolCall(call)))
                .then((toolResults) => {
                  returnedItems += toolResults.reduce((sum, result) => sum + result.itemCount, 0);
                  returnedSources += toolResults.reduce((sum, result) => sum + result.sourceCount, 0);
                  liveSession?.sendToolResponse({
                    functionResponses: toolResults.map((result) => result.response)
                  });
                })
                .catch((error) => reject(error));
            }

            if (message.serverContent?.turnComplete) {
              clearTimeout(timeout);
              liveSession?.close();
              resolve({
                outputLength: outputTranscript.length,
                toolCalls,
                returnedItems,
                returnedSources
              });
            }
          },
          onerror: (event) => reject(event instanceof ErrorEvent ? new Error(event.message) : event),
          onclose: () => undefined
        }
      });
      if (setupComplete) sendPrompt();
    } catch (error) {
      clearTimeout(timeout);
      liveSession?.close();
      reject(error);
    }
  });
}

async function main() {
  loadLocalEnv();

  const platform = await searchLivePlatformProperties("buy apartment in New Cairo under 5 million");
  console.log("platform", {
    total: platform.total,
    returnedItems: platform.items.length,
    firstTitle: platform.items[0]?.title ?? null,
    relaxedFilters: platform.relaxedFilters
  });

  const session = await createLiveEphemeralSession("EN");
  console.log("liveSession", {
    tokenIssued: Boolean(session.token),
    model: session.model,
    voiceName: session.voiceName,
    toolGroups: session.config.tools?.length ?? 0,
    expiresAt: session.expiresAt
  });

  if (process.env.GEMINI_LIVE_SMOKE_TURN === "1") {
    const liveTurn = await runLiveTextTurn({
      token: session.token,
      model: session.model,
      config: session.config
    });
    console.log("liveTurn", liveTurn);
  } else {
    console.log("liveTurn", {
      skipped: true,
      reason: "Set GEMINI_LIVE_SMOKE_TURN=1 to exercise a text turn against the audio Live session."
    });
  }

  const external = await searchLiveExternalMarket("apartments for sale in Dubai under AED 1 million", "EN");
  console.log("external", {
    textLength: external.text.length,
    sources: external.sources.map((source) => new URL(source.uri).hostname.replace(/^www\./, "")),
    model: external.model
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
