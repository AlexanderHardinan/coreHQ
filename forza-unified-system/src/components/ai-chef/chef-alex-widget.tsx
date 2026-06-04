"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChefHat,
  HelpCircle,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import type { UserRole } from "@/lib/auth/permissions";
import {
  buildChefAlexAnswer,
  getChefAlexPageContext,
  getChefAlexQuickQuestions,
} from "@/components/ai-chef/chef-alex-knowledge";

type ChefAlexMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChefAlexWidgetProps = {
  role?: UserRole;
};

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function useTypewriterText(text: string, speed = 18) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    setDisplayText("");

    if (!text) {
      return;
    }

    let index = 0;

    const interval = window.setInterval(() => {
      index += 1;
      setDisplayText(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(interval);
      }
    }, speed);

    return () => {
      window.clearInterval(interval);
    };
  }, [speed, text]);

  return displayText;
}

export function ChefAlexWidget({ role }: ChefAlexWidgetProps) {
  const pathname = usePathname();

  const quickQuestions = useMemo(
    () => getChefAlexQuickQuestions(pathname),
    [pathname],
  );

  const pageContext = useMemo(() => getChefAlexPageContext(pathname), [pathname]);

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeTypedMessageId, setActiveTypedMessageId] = useState("");
  const [messages, setMessages] = useState<ChefAlexMessage[]>([
    {
      id: createMessageId(),
      role: "assistant",
      content:
        "Hello, I am Chef Alex. I can guide you through Forza modules, calculations, realtime sync, Inventory, Kitchen Ops, Bar Ops, Sales Performance, Budgets, Reports, and user permissions.",
    },
  ]);

  const latestAssistantMessage = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === "assistant");
  }, [messages]);

  const typedAssistantText = useTypewriterText(
    latestAssistantMessage?.id === activeTypedMessageId
      ? latestAssistantMessage.content
      : "",
    16,
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, typedAssistantText, isThinking]);

  useEffect(() => {
    if (!latestAssistantMessage || latestAssistantMessage.id !== activeTypedMessageId) {
      setIsSpeaking(false);
      return;
    }

    if (typedAssistantText.length < latestAssistantMessage.content.length) {
      setIsSpeaking(true);
      return;
    }

    setIsSpeaking(false);
  }, [activeTypedMessageId, latestAssistantMessage, typedAssistantText]);

  useEffect(() => {
    if (!isVoiceEnabled || !latestAssistantMessage) {
      return;
    }

    if (latestAssistantMessage.id !== activeTypedMessageId) {
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(latestAssistantMessage.content);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 0.85;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [activeTypedMessageId, isVoiceEnabled, latestAssistantMessage]);

  function sendQuestion(question: string) {
    const cleanQuestion = question.trim();

    if (!cleanQuestion || isThinking) {
      return;
    }

    const userMessage: ChefAlexMessage = {
      id: createMessageId(),
      role: "user",
      content: cleanQuestion,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsThinking(true);

    window.setTimeout(() => {
      const answer = buildChefAlexAnswer(cleanQuestion, {
        pathname,
        role,
      });

      const assistantMessage: ChefAlexMessage = {
        id: createMessageId(),
        role: "assistant",
        content: answer,
      };

      setMessages((current) => [...current, assistantMessage]);
      setActiveTypedMessageId(assistantMessage.id);
      setIsThinking(false);
    }, 650);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendQuestion(input);
  }

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[80] flex items-center gap-3 rounded-full border border-slate-200 bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-2xl transition hover:-translate-y-1 hover:shadow-slate-400/40"
          aria-label="Open Chef Alex assistant"
        >
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-950">
            <ChefHat size={23} />
            <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-emerald-400" />
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-slate-950 bg-emerald-400" />
          </span>
          <span className="hidden sm:block">Ask Chef Alex</span>
        </button>
      ) : null}

      {isOpen ? (
        <section
          className={`fixed bottom-6 right-6 z-[80] flex flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl ${
            isExpanded
              ? "h-[min(760px,calc(100vh-48px))] w-[min(860px,calc(100vw-48px))]"
              : "h-[640px] w-[min(430px,calc(100vw-32px))]"
          }`}
        >
          <div className="relative overflow-hidden bg-slate-950 p-5 text-white">
            <div className="absolute -right-10 -top-10 h-32 w-32 animate-pulse rounded-full bg-amber-300/20 blur-2xl" />
            <div className="absolute -bottom-12 -left-8 h-36 w-36 animate-pulse rounded-full bg-emerald-300/20 blur-2xl" />

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <ChefAlexAvatar isSpeaking={isSpeaking || isThinking} />

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black">Chef Alex</h2>
                    <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-950">
                      Online
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-slate-300">
                    Commercial Forza AI Guide
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsVoiceEnabled((current) => !current)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Toggle Chef Alex voice"
                >
                  {isVoiceEnabled ? <Mic size={17} /> : <MicOff size={17} />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsExpanded((current) => !current)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Resize Chef Alex assistant"
                >
                  {isExpanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Close Chef Alex assistant"
                >
                  <X size={17} />
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold leading-5 text-slate-600 shadow-sm">
              {pageContext}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => sendQuestion(question)}
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-950 hover:text-slate-950"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-white p-5">
            {messages.map((message) => {
              const isActiveTyping =
                message.role === "assistant" && message.id === activeTypedMessageId;

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-[1.35rem] px-4 py-3 text-sm leading-6 shadow-sm ${
                      message.role === "user"
                        ? "bg-slate-950 text-white"
                        : "border border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                        <Bot size={14} />
                        Chef Alex
                      </div>
                    ) : null}

                    <p className="whitespace-pre-wrap">
                      {isActiveTyping ? typedAssistantText : message.content}
                      {isActiveTyping &&
                      typedAssistantText.length < message.content.length ? (
                        <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-slate-500 align-middle" />
                      ) : null}
                    </p>
                  </div>
                </div>
              );
            })}

            {isThinking ? (
              <div className="flex justify-start">
                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="animate-spin" />
                    Chef Alex is thinking...
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-slate-200 bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <HelpCircle
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
                  placeholder="Ask Chef Alex how Forza works..."
                />
              </div>

              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}

type ChefAlexAvatarProps = {
  isSpeaking: boolean;
};

function ChefAlexAvatar({ isSpeaking }: ChefAlexAvatarProps) {
  return (
    <div className="relative h-16 w-16">
      <div className="absolute inset-0 animate-pulse rounded-full bg-amber-300/30 blur-lg" />

      <div className="relative flex h-16 w-16 animate-[chefFloat_3s_ease-in-out_infinite] items-center justify-center rounded-full border-2 border-white/20 bg-gradient-to-br from-amber-100 to-white shadow-xl">
        <div className="absolute -top-2 flex h-7 w-12 items-center justify-center rounded-full bg-white shadow-sm">
          <ChefHat size={22} className="text-slate-950" />
        </div>

        <div className="mt-4 flex flex-col items-center">
          <div className="flex gap-2">
            <span className="h-1.5 w-1.5 animate-[chefBlink_4s_infinite] rounded-full bg-slate-950" />
            <span className="h-1.5 w-1.5 animate-[chefBlink_4s_infinite] rounded-full bg-slate-950" />
          </div>

          <span
            className={`mt-2 rounded-full bg-slate-950 transition-all ${
              isSpeaking ? "h-2 w-4 animate-pulse" : "h-1 w-3"
            }`}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes chefFloat {
          0%,
          100% {
            transform: translateY(0) rotate(-1deg);
          }
          50% {
            transform: translateY(-4px) rotate(1deg);
          }
        }

        @keyframes chefBlink {
          0%,
          92%,
          100% {
            transform: scaleY(1);
          }
          95% {
            transform: scaleY(0.15);
          }
        }
      `}</style>
    </div>
  );
}