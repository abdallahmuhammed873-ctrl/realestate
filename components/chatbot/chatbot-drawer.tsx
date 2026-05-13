"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/layout/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = { role: "user" | "assistant"; content: string };

export function ChatbotDrawer() {
  const { direction, language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: t("assistantGreeting")
    }
  ]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0]?.role !== "assistant") return prev;
      return [{ role: "assistant", content: t("assistantGreeting") }];
    });
  }, [t]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, language: language === "ar" ? "AR" : "EN" })
      });
      const data = await res.json().catch(() => null);
      const reply = typeof data?.reply === "string" && data.reply.trim().length > 0 ? data.reply : t("assistantError");
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: t("assistantError") }]);
    } finally {
      setSending(false);
    }
  }

  const edgeClass = direction === "rtl" ? "left-4" : "right-4";

  return (
    <>
      <Button
        className={`fixed bottom-20 z-50 md:bottom-6 ${edgeClass}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t("closeAssistant") : t("openAssistant")}
      >
        {t("aiAssistant")}
      </Button>
      {open && (
        <aside className={`surface-panel fixed bottom-32 z-50 w-[min(92vw,360px)] rounded-2xl p-3 ${edgeClass}`}>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold">{t("assistant")}</p>
          </div>
          <div className="surface-subtle mb-2 h-64 space-y-2 overflow-auto rounded-xl p-2">
            {messages.map((m, i) => (
              <p
                key={i}
                className={`rounded-lg px-2 py-1 text-sm ${
                  m.role === "assistant" ? "bg-[var(--surface)] text-[var(--ink)]" : "bg-[var(--brand-soft)] text-[var(--ink)]"
                }`}
              >
                {m.content}
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("typeYourQuestion")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
            />
            <Button onClick={() => void sendMessage()} disabled={sending}>
              {sending ? t("sending") : t("send")}
            </Button>
          </div>
        </aside>
      )}
    </>
  );
}
