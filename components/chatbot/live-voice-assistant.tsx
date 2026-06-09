"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI } from "@google/genai";
import type { FunctionCall, LiveConnectConfig, LiveServerMessage, Session } from "@google/genai";

type AssistantItem = {
  id?: string;
  title?: string;
  projectName?: string;
  transaction?: string;
  type?: string;
  price?: number | null;
  rentPrice?: number | null;
  currency?: string | null;
  areaSqm?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  city?: string | null;
  area?: string | null;
  district?: string | null;
  paymentType?: string | null;
  images?: string[];
  verified?: boolean;
  has360View?: boolean;
  hasPanorama360?: boolean;
  hasSpin360?: boolean;
};

type ExternalSource = {
  title: string;
  uri: string;
};

type VoiceChatMessage = {
  role: "user" | "assistant";
  content: string;
  intent?: string;
  suggestions?: string[];
  suggestedFilters?: string[];
  extractedFilters?: Record<string, unknown>;
  relaxedFilters?: string[];
  total?: number;
  items?: AssistantItem[];
  externalSources?: ExternalSource[];
};

type LiveSessionResponse = {
  token?: string;
  model?: string;
  config?: LiveConnectConfig;
  voiceName?: string;
  expiresAt?: string;
  details?: string;
  error?: string;
};

type LiveToolOutput =
  | {
      kind: "platform_search";
      total: number;
      items: AssistantItem[];
      relaxedFilters: string[];
      filters?: Record<string, unknown>;
      message?: string;
    }
  | {
      kind: "external_market";
      text: string;
      sources: ExternalSource[];
      model?: string | null;
      message?: string;
    };

type LiveToolResponse = {
  ok?: boolean;
  output?: LiveToolOutput;
  error?: string;
  details?: string;
};

type VoiceStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "stopping" | "error";

type LiveVoiceAssistantProps = {
  language: "en" | "ar";
  disabled?: boolean;
  onChatMessage: (message: VoiceChatMessage) => void;
};

const PLATFORM_TOOL_NAME = "search_platform_properties";
const EXTERNAL_TOOL_NAME = "search_external_market";
const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;
const MIC_WORKLET_NAME = "gemini-live-mic-input";

const COPY = {
  en: {
    liveVoice: "Live voice",
    start: "Start",
    stop: "Stop",
    ready: "Ready",
    connecting: "Connecting",
    listening: "Listening",
    thinking: "Searching",
    speaking: "Speaking",
    stopping: "Stopping",
    error: "Voice unavailable",
    user: "You",
    assistant: "Assistant",
    cardsReady: "Results ready",
    sourcesReady: "Sources ready",
    fallbackError: "I could not start the live voice assistant. You can keep using text chat.",
    micError: "Microphone access is needed for live voice. Use localhost or HTTPS and allow the browser permission.",
    suggestions: ["Show me apartments with a 360 tour", "Find something outside the website", "Compare these options"]
  },
  ar: {
    liveVoice: "محادثة صوتية",
    start: "ابدأ",
    stop: "إيقاف",
    ready: "جاهز",
    connecting: "جاري الاتصال",
    listening: "أستمع",
    thinking: "أبحث",
    speaking: "يتحدث",
    stopping: "جاري الإيقاف",
    error: "الصوت غير متاح",
    user: "أنت",
    assistant: "المساعد",
    cardsReady: "النتائج جاهزة",
    sourcesReady: "المصادر جاهزة",
    fallbackError: "لم أتمكن من بدء المساعد الصوتي المباشر. يمكنك استخدام المحادثة النصية.",
    micError: "المحادثة الصوتية تحتاج إذن الميكروفون. استخدم localhost أو HTTPS واسمح بالإذن من المتصفح.",
    suggestions: ["اعرض شقق بها عرض 360", "ابحث خارج الموقع", "قارن بين هذه الخيارات"]
  }
} as const;

function normalizeTranscript(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function mergeTranscript(previous: string, next: string) {
  const cleaned = next.trim();
  if (!cleaned) return previous;
  if (!previous) return cleaned;
  if (cleaned.startsWith(previous)) return cleaned;
  if (previous.endsWith(cleaned)) return previous;
  return `${previous}${previous.endsWith(" ") ? "" : " "}${cleaned}`;
}

function normalizeAssistantReply(content: string) {
  return content
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^\s*[*\u2022]\s+/gm, "- ")
    .replace(/(\d+\.\s)/g, "\n$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dedupeSources(values: ExternalSource[]) {
  return Array.from(
    new Map(
      values
        .filter((source) => source.title.trim() && /^https?:\/\//i.test(source.uri))
        .map((source) => [source.uri, { title: source.title.trim(), uri: source.uri.trim() }])
    ).values()
  ).slice(0, 5);
}

function extractGroundingSources(message: LiveServerMessage): ExternalSource[] {
  const chunks = message.serverContent?.groundingMetadata?.groundingChunks ?? [];
  return chunks
    .map((chunk) => {
      const web = chunk.web;
      const maps = chunk.maps;
      const retrieved = chunk.retrievedContext;
      const title = web?.title || maps?.title || retrieved?.title || "";
      const uri = web?.uri || maps?.uri || retrieved?.uri || "";
      return title && uri ? { title, uri } : null;
    })
    .filter((source): source is ExternalSource => Boolean(source));
}

function base64ToUint8Array(base64: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
}

function resampleToRate(input: Float32Array, inputRate: number, outputRate: number) {
  if (inputRate === outputRate) return input;
  const ratio = inputRate / outputRate;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);

  for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
    const inputIndex = outputIndex * ratio;
    const before = Math.floor(inputIndex);
    const after = Math.min(before + 1, input.length - 1);
    const weight = inputIndex - before;
    output[outputIndex] = input[before]! * (1 - weight) + input[after]! * weight;
  }

  return output;
}

function float32ToPcm16Base64(samples: Float32Array, inputRate: number) {
  const resampled = resampleToRate(samples, inputRate, INPUT_SAMPLE_RATE);
  const bytes = new Uint8Array(resampled.length * 2);
  const view = new DataView(bytes.buffer);

  for (let index = 0; index < resampled.length; index += 1) {
    const value = Math.max(-1, Math.min(1, resampled[index]!));
    view.setInt16(index * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  }

  return uint8ArrayToBase64(bytes);
}

function pcm16Base64ToAudioBuffer(context: AudioContext, base64: string) {
  const bytes = base64ToUint8Array(base64);
  const sampleCount = Math.floor(bytes.length / 2);
  const buffer = context.createBuffer(1, sampleCount, OUTPUT_SAMPLE_RATE);
  const channel = buffer.getChannelData(0);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  for (let index = 0; index < sampleCount; index += 1) {
    channel[index] = view.getInt16(index * 2, true) / 0x8000;
  }

  return buffer;
}

function getAudioContextConstructor() {
  return window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

function buildToolErrorResponse(call: FunctionCall, details: string) {
  return {
    id: call.id,
    name: call.name,
    response: {
      error: details
    }
  };
}

export function LiveVoiceAssistant({ language, disabled, onChatMessage }: LiveVoiceAssistantProps) {
  const apiLanguage = language === "ar" ? "AR" : "EN";
  const copy = COPY[language];
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState("");
  const [userTranscript, setUserTranscript] = useState("");
  const [assistantTranscript, setAssistantTranscript] = useState("");
  const [voiceName, setVoiceName] = useState("");
  const [resultCount, setResultCount] = useState(0);
  const [sourceCount, setSourceCount] = useState(0);

  const sessionRef = useRef<Session | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const workletGainRef = useRef<GainNode | null>(null);
  const workletUrlRef = useRef<string | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const outputStartTimeRef = useRef(0);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const userTranscriptRef = useRef("");
  const assistantTranscriptRef = useRef("");
  const turnItemsRef = useRef<AssistantItem[]>([]);
  const turnSourcesRef = useRef<ExternalSource[]>([]);
  const turnTotalRef = useRef(0);
  const turnRelaxedFiltersRef = useRef<string[]>([]);
  const turnFilterLabelsRef = useRef<string[]>([]);
  const turnActiveRef = useRef(false);
  const stoppedRef = useRef(true);

  const appendSources = useCallback((sources: ExternalSource[]) => {
    if (sources.length === 0) return;
    turnSourcesRef.current = dedupeSources([...turnSourcesRef.current, ...sources]);
    setSourceCount(turnSourcesRef.current.length);
  }, []);

  const clearPlayback = useCallback(() => {
    outputSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // The source may already have ended.
      }
    });
    outputSourcesRef.current.clear();
    outputStartTimeRef.current = outputContextRef.current?.currentTime ?? 0;
  }, []);

  const resetTurnState = useCallback(() => {
    turnActiveRef.current = false;
    userTranscriptRef.current = "";
    assistantTranscriptRef.current = "";
    turnItemsRef.current = [];
    turnSourcesRef.current = [];
    turnTotalRef.current = 0;
    turnRelaxedFiltersRef.current = [];
    turnFilterLabelsRef.current = [];
    setUserTranscript("");
    setAssistantTranscript("");
    setResultCount(0);
    setSourceCount(0);
  }, []);

  const beginTurn = useCallback(() => {
    if (turnActiveRef.current) return;
    turnActiveRef.current = true;
    assistantTranscriptRef.current = "";
    turnItemsRef.current = [];
    turnSourcesRef.current = [];
    turnTotalRef.current = 0;
    turnRelaxedFiltersRef.current = [];
    turnFilterLabelsRef.current = [];
    setAssistantTranscript("");
    setResultCount(0);
    setSourceCount(0);
  }, []);

  const commitUserTranscript = useCallback(() => {
    const content = normalizeTranscript(userTranscriptRef.current);
    if (!content) return;
    onChatMessage({ role: "user", content });
    userTranscriptRef.current = "";
    setUserTranscript("");
  }, [onChatMessage]);

  const commitAssistantTurn = useCallback(() => {
    const spoken = normalizeAssistantReply(assistantTranscriptRef.current);
    const fallbackText =
      turnItemsRef.current.length > 0
        ? language === "ar"
          ? `وجدت ${turnTotalRef.current || turnItemsRef.current.length} نتيجة موثقة.`
          : `I found ${turnTotalRef.current || turnItemsRef.current.length} verified result${(turnTotalRef.current || turnItemsRef.current.length) === 1 ? "" : "s"}.`
        : turnSourcesRef.current.length > 0
          ? language === "ar"
            ? "وجدت مصادر خارجية وروابطها ظاهرة في المحادثة."
            : "I found external sources and added the links in the chat."
          : "";
    const content = spoken || fallbackText;

    if (content) {
      onChatMessage({
        role: "assistant",
        content,
        intent: turnItemsRef.current.length > 0 ? "SEARCH_RESULTS" : turnSourcesRef.current.length > 0 ? "GUIDANCE" : undefined,
        suggestions: [...copy.suggestions],
        relaxedFilters: turnRelaxedFiltersRef.current,
        suggestedFilters: turnFilterLabelsRef.current,
        total: turnTotalRef.current,
        items: turnItemsRef.current,
        externalSources: turnSourcesRef.current
      });
    }

    resetTurnState();
  }, [copy.suggestions, language, onChatMessage, resetTurnState]);

  const playAudio = useCallback(async (base64: string) => {
    const context = outputContextRef.current;
    if (!context) return;
    if (context.state === "suspended") await context.resume().catch(() => undefined);

    const buffer = pcm16Base64ToAudioBuffer(context, base64);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => outputSourcesRef.current.delete(source);

    const startTime = Math.max(context.currentTime + 0.02, outputStartTimeRef.current || context.currentTime);
    outputStartTimeRef.current = startTime + buffer.duration;
    outputSourcesRef.current.add(source);
    source.start(startTime);
  }, []);

  const handleToolOutput = useCallback((output: LiveToolOutput) => {
    beginTurn();

    if (output.kind === "platform_search") {
      turnItemsRef.current = output.items ?? [];
      turnTotalRef.current = output.total ?? output.items?.length ?? 0;
      turnRelaxedFiltersRef.current = output.relaxedFilters ?? [];
      turnFilterLabelsRef.current = output.filters ? Object.keys(output.filters).filter((key) => !["page", "pageSize", "sort"].includes(key)) : [];
      setResultCount(turnItemsRef.current.length);
      return;
    }

    if (output.kind === "external_market") {
      appendSources(output.sources ?? []);
      if (output.text && !assistantTranscriptRef.current) {
        assistantTranscriptRef.current = output.text;
        setAssistantTranscript(output.text);
      }
    }
  }, [appendSources, beginTurn]);

  const runToolCall = useCallback(
    async (call: FunctionCall) => {
      if (!call.name || (call.name !== PLATFORM_TOOL_NAME && call.name !== EXTERNAL_TOOL_NAME)) {
        return buildToolErrorResponse(call, `Unsupported tool: ${call.name || "unknown"}`);
      }

      try {
        const res = await fetch("/api/ai/live/tool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: call.name,
            args: call.args ?? {},
            language: apiLanguage
          })
        });
        const data = (await res.json().catch(() => null)) as LiveToolResponse | null;

        if (!res.ok || !data?.output) {
          return buildToolErrorResponse(call, data?.details || data?.error || `Tool request failed with status ${res.status}.`);
        }

        handleToolOutput(data.output);

        return {
          id: call.id,
          name: call.name,
          response: {
            output: data.output
          }
        };
      } catch (toolError) {
        return buildToolErrorResponse(call, toolError instanceof Error ? toolError.message : "Tool request failed.");
      }
    },
    [apiLanguage, handleToolOutput]
  );

  const handleToolCalls = useCallback(
    async (calls: FunctionCall[]) => {
      const session = sessionRef.current;
      if (!session || calls.length === 0) return;
      setStatus("thinking");
      const functionResponses = await Promise.all(calls.map((call) => runToolCall(call)));
      session.sendToolResponse({ functionResponses });
    },
    [runToolCall]
  );

  const handleLiveMessage = useCallback(
    (message: LiveServerMessage) => {
      if (message.setupComplete && !stoppedRef.current) setStatus("listening");
      if (message.serverContent?.interrupted) {
        clearPlayback();
        assistantTranscriptRef.current = "";
        setAssistantTranscript("");
        setStatus("listening");
      }

      const inputTranscript = message.serverContent?.inputTranscription;
      if (inputTranscript?.text) {
        beginTurn();
        userTranscriptRef.current = mergeTranscript(userTranscriptRef.current, inputTranscript.text);
        setUserTranscript(userTranscriptRef.current);
        if (inputTranscript.finished) commitUserTranscript();
      }

      const outputTranscript = message.serverContent?.outputTranscription;
      if (outputTranscript?.text) {
        beginTurn();
        assistantTranscriptRef.current = mergeTranscript(assistantTranscriptRef.current, outputTranscript.text);
        setAssistantTranscript(assistantTranscriptRef.current);
        setStatus("speaking");
      }

      const fallbackText = message.text?.trim();
      if (fallbackText && !outputTranscript?.text) {
        beginTurn();
        assistantTranscriptRef.current = mergeTranscript(assistantTranscriptRef.current, fallbackText);
        setAssistantTranscript(assistantTranscriptRef.current);
      }

      appendSources(extractGroundingSources(message));

      if (message.data) {
        beginTurn();
        setStatus("speaking");
        void playAudio(message.data);
      }

      const calls = message.toolCall?.functionCalls ?? [];
      if (calls.length > 0) void handleToolCalls(calls);

      if (message.serverContent?.turnComplete) {
        commitUserTranscript();
        commitAssistantTurn();
        if (!stoppedRef.current) setStatus("listening");
      }
    },
    [appendSources, beginTurn, clearPlayback, commitAssistantTurn, commitUserTranscript, handleToolCalls, playAudio]
  );

  const sendMicSamples = useCallback((samples: Float32Array, sampleRate: number) => {
    const session = sessionRef.current;
    if (!session || stoppedRef.current || samples.length === 0) return;
    const base64 = float32ToPcm16Base64(samples, sampleRate);
    session.sendRealtimeInput({
      audio: {
        data: base64,
        mimeType: "audio/pcm;rate=16000"
      }
    });
  }, []);

  const startMicProcessing = useCallback(
    async (stream: MediaStream) => {
      const AudioContextCtor = getAudioContextConstructor();
      if (!AudioContextCtor) throw new Error("AudioContext is not supported in this browser.");

      const context = new AudioContextCtor();
      inputContextRef.current = context;
      if (context.state === "suspended") await context.resume().catch(() => undefined);

      const source = context.createMediaStreamSource(stream);
      inputSourceRef.current = source;

      if (context.audioWorklet) {
        const workletCode = `
          class GeminiLiveMicInput extends AudioWorkletProcessor {
            process(inputs) {
              const input = inputs[0];
              if (input && input[0] && input[0].length) {
                const copy = new Float32Array(input[0]);
                this.port.postMessage(copy, [copy.buffer]);
              }
              return true;
            }
          }
          registerProcessor("${MIC_WORKLET_NAME}", GeminiLiveMicInput);
        `;
        const workletUrl = URL.createObjectURL(new Blob([workletCode], { type: "application/javascript" }));
        workletUrlRef.current = workletUrl;
        await context.audioWorklet.addModule(workletUrl);

        const node = new AudioWorkletNode(context, MIC_WORKLET_NAME, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
        const silentGain = context.createGain();
        silentGain.gain.value = 0;
        node.port.onmessage = (event: MessageEvent<Float32Array>) => sendMicSamples(event.data, context.sampleRate);
        source.connect(node);
        node.connect(silentGain);
        silentGain.connect(context.destination);
        workletNodeRef.current = node;
        workletGainRef.current = silentGain;
        return;
      }

      const processor = context.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        event.outputBuffer.getChannelData(0).fill(0);
        sendMicSamples(new Float32Array(input), context.sampleRate);
      };
      source.connect(processor);
      processor.connect(context.destination);
      scriptProcessorRef.current = processor;
    },
    [sendMicSamples]
  );

  const stop = useCallback(async () => {
    if (status === "idle" && !sessionRef.current && !micStreamRef.current && !inputContextRef.current && !outputContextRef.current) return;
    setStatus("stopping");
    stoppedRef.current = true;

    try {
      sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true });
    } catch {
      // The websocket may already be closed.
    }

    try {
      sessionRef.current?.close();
    } catch {
      // The websocket may already be closed.
    }
    sessionRef.current = null;

    workletNodeRef.current?.disconnect();
    workletNodeRef.current?.port.close();
    workletGainRef.current?.disconnect();
    scriptProcessorRef.current?.disconnect();
    inputSourceRef.current?.disconnect();

    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    workletNodeRef.current = null;
    workletGainRef.current = null;
    scriptProcessorRef.current = null;
    inputSourceRef.current = null;

    if (workletUrlRef.current) URL.revokeObjectURL(workletUrlRef.current);
    workletUrlRef.current = null;

    await inputContextRef.current?.close().catch(() => undefined);
    inputContextRef.current = null;
    clearPlayback();
    await outputContextRef.current?.close().catch(() => undefined);
    outputContextRef.current = null;

    commitUserTranscript();
    commitAssistantTurn();
    resetTurnState();
    setStatus("idle");
  }, [clearPlayback, commitAssistantTurn, commitUserTranscript, resetTurnState, status]);

  const start = useCallback(async () => {
    if (disabled || status === "connecting" || status === "listening" || status === "thinking" || status === "speaking") return;
    setError("");
    setStatus("connecting");
    stoppedRef.current = false;
    resetTurnState();

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error(copy.micError);
      const AudioContextCtor = getAudioContextConstructor();
      if (!AudioContextCtor) throw new Error("AudioContext is not supported in this browser.");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      micStreamRef.current = stream;

      outputContextRef.current = new AudioContextCtor({ sampleRate: OUTPUT_SAMPLE_RATE });
      await outputContextRef.current.resume().catch(() => undefined);
      outputStartTimeRef.current = outputContextRef.current.currentTime;

      const response = await fetch("/api/ai/live/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: apiLanguage })
      });
      const data = (await response.json().catch(() => null)) as LiveSessionResponse | null;
      if (!response.ok || !data?.token || !data.model || !data.config) {
        throw new Error(data?.details || data?.error || copy.fallbackError);
      }

      setVoiceName(data.voiceName || "");
      const ai = new GoogleGenAI({
        apiKey: data.token,
        httpOptions: { apiVersion: "v1alpha" }
      });
      const session = await ai.live.connect({
        model: data.model,
        config: data.config,
        callbacks: {
          onopen: () => {
            if (!stoppedRef.current) setStatus("listening");
          },
          onmessage: handleLiveMessage,
          onerror: (event) => {
            const message = event instanceof ErrorEvent ? event.message : copy.fallbackError;
            setError(message || copy.fallbackError);
            setStatus("error");
          },
          onclose: () => {
            if (!stoppedRef.current) setStatus("idle");
          }
        }
      });
      sessionRef.current = session;
      await startMicProcessing(stream);
      if (!stoppedRef.current) setStatus("listening");
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : copy.fallbackError);
      await stop();
      setStatus("error");
    }
  }, [apiLanguage, copy.fallbackError, copy.micError, disabled, handleLiveMessage, resetTurnState, startMicProcessing, status, stop]);

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      try {
        sessionRef.current?.close();
      } catch {
        // Ignore cleanup errors during unmount.
      }
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (workletUrlRef.current) URL.revokeObjectURL(workletUrlRef.current);
      void inputContextRef.current?.close().catch(() => undefined);
      void outputContextRef.current?.close().catch(() => undefined);
    };
  }, []);

  const active = status === "connecting" || status === "listening" || status === "thinking" || status === "speaking";
  const statusLabel =
    status === "idle"
      ? copy.ready
      : status === "connecting"
        ? copy.connecting
        : status === "listening"
          ? copy.listening
          : status === "thinking"
            ? copy.thinking
            : status === "speaking"
              ? copy.speaking
              : status === "stopping"
                ? copy.stopping
                : copy.error;

  return (
    <div className="rounded-2xl border theme-divider bg-[var(--surface-soft)] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-emerald-400" : status === "error" ? "bg-rose-400" : "bg-[var(--muted)]"}`} />
            <p className="text-xs font-semibold">{copy.liveVoice}</p>
            {voiceName ? <span className="hidden text-[11px] text-muted sm:inline">{voiceName}</span> : null}
          </div>
          <p className="mt-0.5 text-[11px] text-muted">{statusLabel}</p>
        </div>
        <button
          type="button"
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
            active
              ? "bg-[var(--ink)] text-[var(--surface)] hover:opacity-90"
              : "bg-[var(--brand)] text-[var(--brand-contrast)] hover:opacity-90"
          } disabled:cursor-not-allowed disabled:opacity-50`}
          onClick={() => {
            if (active) void stop();
            else void start();
          }}
          disabled={disabled || status === "stopping"}
        >
          {active ? copy.stop : copy.start}
        </button>
      </div>

      {userTranscript || assistantTranscript || resultCount > 0 || sourceCount > 0 ? (
        <div className="mt-2 space-y-1.5 border-t theme-divider pt-2">
          {userTranscript ? (
            <p className="line-clamp-2 text-xs text-muted">
              <span className="font-semibold text-[var(--ink)]">{copy.user}: </span>
              {userTranscript}
            </p>
          ) : null}
          {assistantTranscript ? (
            <p className="line-clamp-3 text-xs text-muted">
              <span className="font-semibold text-[var(--ink)]">{copy.assistant}: </span>
              {assistantTranscript}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {resultCount > 0 ? <span className="status-positive rounded-full px-2 py-0.5 text-[10px] font-semibold">{copy.cardsReady}</span> : null}
            {sourceCount > 0 ? <span className="status-brand rounded-full px-2 py-0.5 text-[10px] font-semibold">{copy.sourcesReady}</span> : null}
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
