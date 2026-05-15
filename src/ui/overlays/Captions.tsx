"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAIStore } from "@/store/ai";
import { createSpeechRecognition } from "@/ai/speech";
import { analyzeUtterance } from "@/ai/coach";

export function Captions({ audience = false }: { audience?: boolean }) {
  const captions = useAIStore((s) => s.captions);
  const pushCaption = useAIStore((s) => s.pushCaption);
  const translation = useAIStore((s) => s.translation);
  const setCoach = useAIStore((s) => s.setCoach);
  const lang = useAIStore((s) => s.captionLanguage);
  const listening = useAIStore((s) => s.voiceListening);
  const startedAt = useRef<number | null>(null);
  const handleRef = useRef<ReturnType<typeof createSpeechRecognition>>(null);
  const [interim, setInterim] = useState("");

  useEffect(() => {
    if (!listening) {
      handleRef.current?.stop();
      handleRef.current = null;
      return;
    }
    const h = createSpeechRecognition({
      lang,
      onInterim: setInterim,
      onFinal: (text) => {
        if (!startedAt.current) startedAt.current = Date.now();
        const secs = (Date.now() - startedAt.current) / 1000;
        const m = analyzeUtterance(text, secs || 1);
        setCoach({ pace: m.wpm, fillerWords: m.fillers, sentiment: m.sentiment });
        pushCaption({
          id: Math.random().toString(36).slice(2),
          t: Date.now(),
          text,
          final: true,
        });
        setInterim("");
      },
      onError: () => undefined,
    });
    handleRef.current = h ?? null;
    h?.start();
    return () => {
      h?.stop();
    };
  }, [listening, lang, pushCaption, setCoach]);

  const last = captions[captions.length - 1];
  const live = interim || last?.text || "";

  return (
    <AnimatePresence>
      {live && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.3 }}
          className={`pointer-events-none absolute inset-x-0 ${audience ? "bottom-10" : "bottom-24"} z-30 flex justify-center px-8`}
        >
          <div className="max-w-3xl rounded-2xl border border-white/10 bg-ink-950/70 px-6 py-3 text-center backdrop-blur-2xl">
            <p className="text-xl font-medium text-ink-50">{live}</p>
            {translation && (
              <p className="mt-1 text-sm italic text-ink-300">{translation}</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
