"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Mic, MicOff, Send, Sparkles, X, Languages } from "lucide-react";
import { useAIStore, type AssistantMessage } from "@/store/ai";
import { useDeckStore } from "@/store/deck";
import { useSceneStore } from "@/store/scene";

const LANGS = [
  { code: "en-US", label: "EN" },
  { code: "es-ES", label: "ES" },
  { code: "fr-FR", label: "FR" },
  { code: "de-DE", label: "DE" },
  { code: "ja-JP", label: "JP" },
];

export function AIPanel() {
  const open = useAIStore((s) => s.open);
  const toggle = useAIStore((s) => s.toggle);
  const messages = useAIStore((s) => s.messages);
  const push = useAIStore((s) => s.pushMessage);
  const thinking = useAIStore((s) => s.thinking);
  const setThinking = useAIStore((s) => s.setThinking);
  const listening = useAIStore((s) => s.voiceListening);
  const setListening = useAIStore((s) => s.setVoiceListening);
  const coach = useAIStore((s) => s.coach);
  const lang = useAIStore((s) => s.captionLanguage);
  const setLang = useAIStore((s) => s.setLanguage);
  const slide = useDeckStore((s) => s.deck?.slides[s.index]);
  const setMode = useSceneStore((s) => s.setMode);
  const [input, setInput] = useState("");
  const introPushed = useRef(false);

  useEffect(() => {
    if (!open || introPushed.current) return;
    introPushed.current = true;
    push({
      id: "intro",
      role: "assistant",
      content:
        "Hi — I’m your stage assistant. Ask me to switch modes, summarize the current slide, draft a sticky note, or coach your pace.",
      t: Date.now(),
    });
  }, [open, push]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const userMsg: AssistantMessage = {
      id: Math.random().toString(36).slice(2),
      role: "user",
      content: text,
      t: Date.now(),
    };
    push(userMsg);
    setThinking(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          slide,
          coach,
          history: messages.slice(-8),
        }),
      });
      const data = await res.json();
      if (data.intent === "set-mode" && data.mode) setMode(data.mode);
      push({
        id: Math.random().toString(36).slice(2),
        role: "assistant",
        content: data.reply ?? "(no reply)",
        t: Date.now(),
      });
    } catch {
      push({
        id: Math.random().toString(36).slice(2),
        role: "assistant",
        content: "I couldn’t reach the model. Local heuristics only for now.",
        t: Date.now(),
      });
    } finally {
      setThinking(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="pointer-events-auto absolute bottom-24 right-4 z-40 flex w-[360px] flex-col gap-3"
        >
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900/80 backdrop-blur-3xl shadow-glowViolet">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-aurora-violet" />
                <span className="text-sm font-medium text-white">Stage Assistant</span>
              </div>
              <button onClick={toggle} className="text-ink-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="max-h-[380px] space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === "user"
                      ? "ml-8 rounded-2xl rounded-tr-md bg-aurora-cyan/15 px-3 py-2 text-sm text-aurora-cyan"
                      : "mr-8 rounded-2xl rounded-tl-md bg-white/5 px-3 py-2 text-sm text-ink-100"
                  }
                >
                  {m.content}
                </div>
              ))}
              {thinking && (
                <div className="flex items-center gap-2 text-xs text-ink-400">
                  <Bot size={12} className="animate-pulse" /> thinking…
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 border-t border-white/10 px-3 py-2">
              <button
                onClick={() => setListening(!listening)}
                className={
                  "rounded-lg p-2 " +
                  (listening
                    ? "bg-rose-500/15 text-rose-200"
                    : "text-ink-300 hover:bg-white/5 hover:text-white")
                }
                title={listening ? "Stop captions" : "Start captions"}
              >
                {listening ? <Mic size={14} /> : <MicOff size={14} />}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
                placeholder="Ask the assistant…"
                className="flex-1 bg-transparent px-2 text-sm text-white placeholder:text-ink-500 focus:outline-none"
              />
              <button
                onClick={send}
                className="rounded-lg p-2 text-aurora-cyan hover:bg-aurora-cyan/10"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider">
            <div className="rounded-2xl border border-white/10 bg-ink-900/70 px-3 py-2 text-ink-200 backdrop-blur-3xl">
              Pace
              <div
                className={
                  "mt-0.5 text-base " +
                  (coach.sentiment === "rushed"
                    ? "text-rose-300"
                    : coach.sentiment === "engaged"
                      ? "text-aurora-gold"
                      : "text-aurora-cyan")
                }
              >
                {Math.round(coach.pace)} <span className="text-xs text-ink-400">wpm</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-ink-900/70 px-3 py-2 text-ink-200 backdrop-blur-3xl">
              Fillers
              <div className="mt-0.5 text-base text-aurora-pink">{coach.fillerWords}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-ink-900/70 px-2 py-1 backdrop-blur-3xl">
            <Languages size={12} className="ml-1 text-ink-400" />
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={
                  "rounded-md px-2 py-1 text-[10px] uppercase tracking-wider " +
                  (lang === l.code
                    ? "bg-aurora-violet/20 text-aurora-violet"
                    : "text-ink-400 hover:text-white")
                }
              >
                {l.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
