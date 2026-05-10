"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/layout/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = { role: "user" | "assistant"; content: string };

export function ChatbotDrawer() {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
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
    if (!input.trim()) return;
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage, language: language === "ar" ? "AR" : "EN" })
    });
    const data = await res.json();
    setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
  }

  return (
    <>
      <Button className="fixed bottom-20 right-4 z-50 md:bottom-6" onClick={() => setOpen((v) => !v)}>
        {t("aiAssistant")}
      </Button>
      {open && (
        <aside className="fixed bottom-32 right-4 z-50 w-[min(92vw,360px)] rounded-2xl border bg-white p-3 shadow-soft">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold">{t("assistant")}</p>
          </div>
          <div className="mb-2 h-64 space-y-2 overflow-auto rounded-xl bg-slate-50 p-2">
            {messages.map((m, i) => (
              <p key={i} className={`rounded-lg px-2 py-1 text-sm ${m.role === "assistant" ? "bg-white" : "bg-brand-100"}`}>
                {m.content}
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("typeYourQuestion")} />
            <Button onClick={sendMessage}>{t("send")}</Button>
          </div>
        </aside>
      )}
    </>
  );
}
