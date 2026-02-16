"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = { role: "user" | "assistant"; content: string };

export function ChatbotDrawer() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"EN" | "AR">("EN");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi, I can help you find properties. Budget? Buy, rent, or vacation?"
    }
  ]);

  async function sendMessage() {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage, language: lang })
    });
    const data = await res.json();
    setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
  }

  return (
    <>
      <Button className="fixed bottom-20 right-4 z-50 md:bottom-6" onClick={() => setOpen((v) => !v)}>
        AI Assistant
      </Button>
      {open && (
        <aside className="fixed bottom-32 right-4 z-50 w-[min(92vw,360px)] rounded-2xl border bg-white p-3 shadow-soft">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold">Assistant</p>
            <button className="text-xs text-brand-700" onClick={() => setLang((l) => (l === "EN" ? "AR" : "EN"))}>
              {lang}
            </button>
          </div>
          <div className="mb-2 h-64 space-y-2 overflow-auto rounded-xl bg-slate-50 p-2">
            {messages.map((m, i) => (
              <p key={i} className={`rounded-lg px-2 py-1 text-sm ${m.role === "assistant" ? "bg-white" : "bg-brand-100"}`}>
                {m.content}
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={lang === "EN" ? "Type your question" : "اكتب سؤالك"} />
            <Button onClick={sendMessage}>Send</Button>
          </div>
        </aside>
      )}
    </>
  );
}
