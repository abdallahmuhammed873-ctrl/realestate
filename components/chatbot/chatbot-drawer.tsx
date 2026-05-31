"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/layout/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPropertyCoverImage } from "@/lib/property-images";

type ChatRole = "user" | "assistant";

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

type AssistantResponse = {
  reply?: string;
  intent?: string;
  shouldSearch?: boolean;
  clarifyingQuestion?: string | null;
  suggestions?: string[];
  suggestedFilters?: string[];
  extractedFilters?: Record<string, unknown>;
  relaxedFilters?: string[];
  total?: number;
  items?: AssistantItem[];
  externalSources?: Array<{ title: string; uri: string }>;
};

type Message = {
  role: ChatRole;
  content: string;
  intent?: string;
  suggestions?: string[];
  suggestedFilters?: string[];
  extractedFilters?: Record<string, unknown>;
  relaxedFilters?: string[];
  total?: number;
  items?: AssistantItem[];
};

const QUICK_PROMPTS = {
  en: [
    "Buy apartment in New Cairo under 5,000,000 EGP",
    "Rent villa in Maadi",
    "Compare two apartments in Cairo",
  ],
  ar: [
    "شراء شقة في القاهرة الجديدة أقل من 5,000,000 جنيه",
    "إيجار فيلا في المعادي",
    "قارن بين شقتين في القاهرة",
  ],
} as const;

const CHAT_DEBUG_ENABLED = process.env.NODE_ENV !== "production";

function normalizeAssistantReply(content: string) {
  return content
    .replaceAll("**", "")
    .replace(/(\d+\.\s)/g, "\n$1")
    .replace(/\s+\*\s/g, "\n- ")
    .replace(/Note that/gi, "\nNote:")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatFilterKey(key: string, language: "en" | "ar") {
  const labels: Record<string, { en: string; ar: string }> = {
    transaction: { en: "Deal", ar: "العملية" },
    projectName: { en: "Project", ar: "المشروع" },
    city: { en: "City", ar: "المدينة" },
    area: { en: "Area", ar: "المنطقة" },
    district: { en: "District", ar: "الحي" },
    type: { en: "Type", ar: "النوع" },
    minPrice: { en: "Min budget", ar: "أقل ميزانية" },
    maxPrice: { en: "Max budget", ar: "أعلى ميزانية" },
    minBeds: { en: "Bedrooms", ar: "الغرف" },
    paymentType: { en: "Payment", ar: "الدفع" },
    completionStatus: { en: "Completion", ar: "التسليم" },
    hasGarden: { en: "Garden", ar: "حديقة" },
    hasRoof: { en: "Roof", ar: "روف" },
    has360View: { en: "360 View", ar: "عرض 360" },
  };
  return labels[key]?.[language] ?? key;
}

function formatPrice(item: AssistantItem, language: "en" | "ar") {
  const value = item.transaction === "RENT" ? item.rentPrice : item.price;
  if (typeof value !== "number") return language === "ar" ? "السعر عند الطلب" : "Price on request";
  return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency: item.currency || "EGP",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildHistory(messages: Message[]) {
  return messages.slice(-8).map(({ role, content }) => ({ role, content }));
}

function createChatTraceId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function logChatRequest(traceId: string, payload: { message: string; language: "EN" | "AR"; history: { role: ChatRole; content: string }[] }) {
  if (!CHAT_DEBUG_ENABLED) return;
  console.groupCollapsed(`[AI Chat][${traceId}] request`);
  console.log("message", payload.message);
  console.log("language", payload.language);
  console.log("historyCount", payload.history.length);
  console.log("history", payload.history);
  console.groupEnd();
}

function logChatResponse(
  traceId: string,
  meta: { ok: boolean; status: number },
  data: AssistantResponse | Record<string, unknown> | null,
) {
  if (!CHAT_DEBUG_ENABLED) return;
  console.groupCollapsed(`[AI Chat][${traceId}] response ${meta.status}`);
  console.log("ok", meta.ok);
  console.log("body", data);
  if (data && typeof data === "object") {
    console.log("reply", "reply" in data ? data.reply : undefined);
    console.log("intent", "intent" in data ? data.intent : undefined);
    console.log("items", Array.isArray(data.items) ? data.items.length : 0);
    console.log("suggestions", Array.isArray(data.suggestions) ? data.suggestions : []);
  }
  console.groupEnd();
}

function logChatError(traceId: string, error: unknown) {
  if (!CHAT_DEBUG_ENABLED) return;
  console.error(`[AI Chat][${traceId}] request failed`, error);
}

export function ChatbotDrawer() {
  const { direction, language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function sendMessage(nextMessage?: string) {
    if (sending) return;
    const userMessage = (nextMessage ?? input).trim();
    if (!userMessage) return;

    const history = buildHistory(messages);
    const requestLanguage: "EN" | "AR" = language === "ar" ? "AR" : "EN";
    const traceId = createChatTraceId();
    const payload = {
      message: userMessage,
      language: requestLanguage,
      history,
    };
    logChatRequest(traceId, payload);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-chat-trace-id": traceId,
        },
        body: JSON.stringify(payload),
      });
      const data: AssistantResponse | Record<string, unknown> | null = await res.json().catch(() => null);
      logChatResponse(traceId, { ok: res.ok, status: res.status }, data);
      const reply =
        typeof (data as AssistantResponse | null)?.reply === "string" && (data as AssistantResponse).reply!.trim().length > 0
          ? normalizeAssistantReply((data as AssistantResponse).reply!)
          : t("assistantError");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply,
          intent: (data as AssistantResponse | null)?.intent,
          suggestions: Array.isArray((data as AssistantResponse | null)?.suggestions) ? (data as AssistantResponse).suggestions! : [],
          suggestedFilters: Array.isArray((data as AssistantResponse | null)?.suggestedFilters) ? (data as AssistantResponse).suggestedFilters! : [],
          extractedFilters: (data as AssistantResponse | null)?.extractedFilters ?? {},
          relaxedFilters: Array.isArray((data as AssistantResponse | null)?.relaxedFilters) ? (data as AssistantResponse).relaxedFilters! : [],
          total: typeof (data as AssistantResponse | null)?.total === "number" ? (data as AssistantResponse).total! : 0,
          items: Array.isArray((data as AssistantResponse | null)?.items) ? (data as AssistantResponse).items! : [],
        },
      ]);
    } catch (error) {
      logChatError(traceId, error);
      setMessages((prev) => [...prev, { role: "assistant", content: t("assistantError") }]);
    } finally {
      setSending(false);
    }
  }

  const edgeClass = direction === "rtl" ? "left-4" : "right-4";
  const quickPrompts = QUICK_PROMPTS[language];

  return (
    <>
      {!open ? (
        <Button
          className={`fixed bottom-20 z-50 gap-2 rounded-full px-5 py-3 md:bottom-6 ${edgeClass}`}
          onClick={() => setOpen(true)}
          aria-label={t("openAssistant")}
        >
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden />
          {t("aiAssistant")}
        </Button>
      ) : null}
      {open ? (
        <aside
          className={`surface-panel fixed ${edgeClass} top-4 bottom-4 z-50 flex w-[min(96vw,420px)] flex-col overflow-hidden rounded-[28px]`}
        >
          <div className="border-b theme-divider bg-[linear-gradient(135deg,rgba(46,111,127,0.18),rgba(212,176,106,0.12))] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">{t("assistant")}</p>
                <p className="mt-0.5 text-xs text-muted">{t("assistantSubtitle")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="status-positive rounded-full px-2.5 py-1 text-[11px] font-semibold">
                  {sending ? t("assistantSearching") : t("assistantReady")}
                </span>
                <button
                  type="button"
                  aria-label={t("closeAssistant")}
                  className="grid h-8 w-8 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                  onClick={() => setOpen(false)}
                >
                  <span className="text-lg leading-none" aria-hidden>
                    ×
                  </span>
                </button>
              </div>
            </div>
            {messages.length === 0 ? (
              <div className="flex flex-wrap gap-2 pt-3">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-full border theme-divider bg-[var(--surface)] px-3 py-1.5 text-left text-xs leading-5 text-[var(--ink)] shadow-sm hover:bg-[var(--surface-soft)]"
                    onClick={() => void sendMessage(prompt)}
                    disabled={sending}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-auto bg-[var(--surface-soft)] px-3 py-3">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    message.role === "assistant"
                      ? "bg-[var(--surface)] text-[var(--ink)]"
                      : "bg-[var(--brand)] text-[var(--brand-contrast)]"
                  }`}
                >
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">
                    {message.role === "assistant" ? t("assistant") : t("you")}
                  </p>
                  <p className="whitespace-pre-line leading-6">{message.content}</p>

                  {message.role === "assistant" && message.relaxedFilters && message.relaxedFilters.length > 0 ? (
                    <p className="mt-2 text-xs text-muted">
                      {language === "ar" ? "تم توسيع البحث عبر:" : "Search widened by:"}{" "}
                      {message.relaxedFilters.map((key) => formatFilterKey(key, language)).join(", ")}
                    </p>
                  ) : null}

                  {message.role === "assistant" && message.suggestedFilters && message.suggestedFilters.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {message.suggestedFilters.map((key) => (
                        <span key={key} className="status-brand rounded-full px-2.5 py-1 text-[11px] font-semibold">
                          {formatFilterKey(key, language)}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {message.role === "assistant" && message.items && message.items.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-soft">
                        {language === "ar"
                          ? `النتائج${message.total ? ` (${message.total})` : ""}`
                          : `Results${message.total ? ` (${message.total})` : ""}`}
                      </p>
                      {message.items.map((item) => {
                        const title = item.title || item.projectName || (language === "ar" ? "عقار" : "Property");
                        const location = [item.district, item.area, item.city].filter(Boolean).join(", ");
                        const coverImage = getPropertyCoverImage(item.images);

                        return (
                          <a
                            key={item.id || `${title}-${location}`}
                            href={item.id ? `/p/${item.id}` : "#"}
                            className="block overflow-hidden rounded-2xl border theme-divider bg-[var(--surface-soft)] hover:bg-[var(--surface-strong)]"
                          >
                            <div className="flex gap-3 p-2.5">
                              <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[var(--surface)]">
                                <img src={coverImage} alt={title} className="h-full w-full object-cover" loading="lazy" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex flex-wrap gap-1.5">
                                  {item.verified ? (
                                    <span className="status-positive rounded-full px-2 py-0.5 text-[10px] font-semibold">
                                      {language === "ar" ? "موثق" : "Verified"}
                                    </span>
                                  ) : null}
                                  {item.paymentType ? (
                                    <span className="status-brand rounded-full px-2 py-0.5 text-[10px] font-semibold">{item.paymentType}</span>
                                  ) : null}
                                  {item.has360View ? (
                                    <span className="status-brand rounded-full px-2 py-0.5 text-[10px] font-semibold">
                                      {language === "ar" ? "عرض 360" : "360 View"}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="line-clamp-1 text-sm font-semibold">{title}</p>
                                <p className="text-xs font-semibold text-[var(--brand-strong)]">{formatPrice(item, language)}</p>
                                <p className="line-clamp-1 text-xs text-muted">{location || (language === "ar" ? "الموقع غير محدد" : "Location not specified")}</p>
                                <p className="text-xs text-soft">
                                  {typeof item.areaSqm === "number" ? `${item.areaSqm} sqm` : ""}
                                  {typeof item.bedrooms === "number" ? ` • ${item.bedrooms} BR` : ""}
                                  {typeof item.bathrooms === "number" ? ` • ${item.bathrooms} bath` : ""}
                                </p>
                              </div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  ) : null}

                  {message.role === "assistant" && message.suggestions && message.suggestions.length > 0 ? (
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-soft">
                        {language === "ar" ? "الخطوة التالية" : "Next step"}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {message.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            className="rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-medium text-[var(--brand-strong)] hover:opacity-90"
                            onClick={() => void sendMessage(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {sending ? (
              <div className="flex justify-start">
                <div className="max-w-[88%] rounded-2xl bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] shadow-sm">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">{t("assistant")}</p>
                  <p className="text-muted">{t("assistantThinking")}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t theme-divider bg-[var(--surface)] px-3 py-2.5">
            <p className="mb-2 text-xs text-muted">{t("assistantInputHint")}</p>
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t("typeYourQuestion")}
              className="mb-2"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="text-xs font-medium text-muted hover:text-[var(--ink)]"
                onClick={() => setMessages([])}
                disabled={sending}
              >
                {t("clearChat")}
              </button>
              <Button onClick={() => void sendMessage()} disabled={sending || !input.trim()}>
                {sending ? t("sending") : t("send")}
              </Button>
            </div>
          </div>
        </aside>
      ) : null}
    </>
  );
}
