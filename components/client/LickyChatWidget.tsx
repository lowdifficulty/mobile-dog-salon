"use client";

import { useEffect, useRef, useState } from "react";
import { LICKY_AVATAR, LICKY_WELCOME_MESSAGE } from "@/lib/client/portal";

export interface LickyButton {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  buttons?: LickyButton[];
}

interface ChatApiResponse {
  reply: string;
  buttons?: LickyButton[];
  error?: string;
}

export default function LickyChatWidget({
  showWelcome,
  onWelcomeComplete,
}: {
  showWelcome?: boolean;
  onWelcomeComplete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [welcomeStep, setWelcomeStep] = useState(showWelcome ?? false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showWelcome) {
      setOpen(true);
      setWelcomeStep(true);
    }
  }, [showWelcome]);

  useEffect(() => {
    function onWelcome() {
      setOpen(true);
      setWelcomeStep(true);
    }
    window.addEventListener("licky-welcome", onWelcome);
    return () => window.removeEventListener("licky-welcome", onWelcome);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, welcomeStep, busy]);

  function pushAssistant(data: ChatApiResponse, fallback = "Woof! Try again.") {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: data.reply || fallback,
        buttons: data.buttons,
      },
    ]);
  }

  async function postChat(body: Record<string, unknown>): Promise<ChatApiResponse> {
    const res = await fetch("/api/client/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as ChatApiResponse;
    if (!res.ok) {
      const msg = data.reply || data.error || "Something went wrong.";
      return { reply: msg, buttons: [] };
    }
    return data;
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setDraft("");
    setBusy(true);

    try {
      const data = await postChat({
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
      });
      pushAssistant(data);
    } catch {
      pushAssistant({ reply: "Connection hiccup — try again!" });
    } finally {
      setBusy(false);
    }
  }

  async function handleButton(button: LickyButton) {
    if (busy) return;
    setBusy(true);

    try {
      if (button.action === "send_message") {
        const message = String(button.payload?.message ?? button.label);
        const nextMessages: ChatMessage[] = [
          ...messages,
          { role: "user", content: message },
        ];
        setMessages(nextMessages);
        const data = await postChat({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        });
        pushAssistant(data);
        return;
      }

      if (button.action === "book_slot") {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: `Book ${button.label}` },
        ]);
        const data = await postChat({
          action: { type: "book_slot", payload: button.payload },
        });
        pushAssistant(data, "Could not book that time.");
        return;
      }

      if (
        button.action === "show_more_availability" ||
        button.action === "show_availability"
      ) {
        const data = await postChat({
          action: {
            type: button.action,
            payload: button.payload,
          },
        });
        pushAssistant(data);
        return;
      }

      pushAssistant({ reply: "Try another option!" });
    } catch {
      pushAssistant({ reply: "Woof! Try that again." });
    } finally {
      setBusy(false);
    }
  }

  function finishWelcome() {
    setWelcomeStep(false);
    onWelcomeComplete?.();
    void fetch("/api/client/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearLickyWelcome: true }),
    }).catch(() => {});
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-[min(100vw-2rem,380px)] rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col overflow-hidden max-h-[min(70vh,520px)]">
          <div className="flex items-center gap-3 px-4 py-3 bg-brand text-white">
            <img
              src={LICKY_AVATAR}
              alt="Licky"
              className="w-10 h-10 rounded-full border-2 border-white/40 object-cover bg-amber-100"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Licky</p>
              <p className="text-xs text-white/80">Your grooming buddy</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white text-xl leading-none"
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/80">
            {welcomeStep ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <img src={LICKY_AVATAR} alt="" className="w-8 h-8 rounded-full shrink-0" />
                  <div className="rounded-2xl rounded-tl-sm bg-white border border-gray-100 px-3 py-2 text-sm text-gray-800">
                    {LICKY_WELCOME_MESSAGE}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={finishWelcome}
                  className="w-full py-2.5 bg-brand text-white text-sm font-semibold rounded-full"
                >
                  Next
                </button>
              </div>
            ) : (
              <>
                {messages.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Ask Licky anything — grooming tips, pricing, open times, and more.
                  </p>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`flex gap-2 max-w-full ${msg.role === "user" ? "justify-end" : ""}`}
                    >
                      {msg.role === "assistant" && (
                        <img src={LICKY_AVATAR} alt="" className="w-8 h-8 rounded-full shrink-0" />
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          msg.role === "user"
                            ? "bg-brand text-white rounded-tr-sm"
                            : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                    {msg.role === "assistant" && msg.buttons && msg.buttons.length > 0 && (
                      <div className="flex flex-col gap-1.5 w-full max-w-[85%] ml-10">
                        {msg.buttons.map((btn, j) => (
                          <button
                            key={`${i}-${j}`}
                            type="button"
                            disabled={busy}
                            onClick={() => void handleButton(btn)}
                            className="w-full text-left px-3 py-2 text-xs font-semibold rounded-full border border-brand/30 bg-white text-brand hover:bg-brand/5 disabled:opacity-50 truncate"
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {!welcomeStep && (
            <form
              className="p-3 border-t border-gray-100 flex gap-2 bg-white"
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage(draft);
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Message Licky…"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-full text-sm"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-full disabled:opacity-50"
              >
                Send
              </button>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-brand text-white shadow-lg pl-2 pr-4 py-2 hover:bg-brand-dark transition-colors"
      >
        <img
          src={LICKY_AVATAR}
          alt="Chat with Licky"
          className="w-10 h-10 rounded-full border-2 border-white/30 object-cover bg-amber-100"
        />
        <span className="text-sm font-semibold">Chat with Licky</span>
      </button>
    </>
  );
}
