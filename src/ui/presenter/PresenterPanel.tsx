"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useDeckStore } from "@/store/deck";
import { usePresenterStore } from "@/store/presenter";
import { formatTime } from "@/lib/utils";
import { Clock, FileText, Map as MapIcon } from "lucide-react";

export function PresenterPanel() {
  const deck = useDeckStore((s) => s.deck);
  const index = useDeckStore((s) => s.index);
  const goto = useDeckStore((s) => s.goto);
  const isPresenting = usePresenterStore((s) => s.isPresenting);
  const startedAt = usePresenterStore((s) => s.startedAt);
  const goal = usePresenterStore((s) => s.durationGoalMs);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  if (!deck) return null;
  const slide = deck.slides[index];
  const elapsed = startedAt ? Date.now() - startedAt : 0;
  const remaining = Math.max(0, goal - elapsed);
  const overtime = elapsed > goal;

  return (
    <motion.aside
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 220, damping: 24 }}
      className="pointer-events-auto absolute left-4 top-4 z-40 flex max-h-[calc(100%-2rem)] w-[320px] flex-col gap-3"
    >
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-ink-900/70 p-3 backdrop-blur-3xl">
        <div className="flex items-center gap-2 text-ink-200">
          <Clock size={14} />
          <div className="font-mono text-sm tabular-nums">
            <span className="text-white">{formatTime(elapsed)}</span>
            <span className="mx-1 text-ink-500">/</span>
            <span className={overtime ? "text-rose-300" : "text-ink-400"}>
              {overtime ? "+" : ""}
              {formatTime(overtime ? elapsed - goal : remaining)}
            </span>
          </div>
        </div>
        <span
          className={
            isPresenting
              ? "rounded-full bg-aurora-cyan/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-aurora-cyan"
              : "rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-400"
          }
        >
          {isPresenting ? "Live" : "Idle"}
        </span>
      </div>
      <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-3 backdrop-blur-3xl">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-400">
          <FileText size={12} /> Presenter notes
        </div>
        <p className="text-sm leading-relaxed text-ink-100">
          {slide.notes ?? "—"}
        </p>
      </div>
      <div className="overflow-y-auto rounded-2xl border border-white/10 bg-ink-900/70 p-3 backdrop-blur-3xl">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-400">
          <MapIcon size={12} /> Slides
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {deck.slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goto(i)}
              className={
                "group relative aspect-[16/9] overflow-hidden rounded-lg border text-left transition-all " +
                (i === index
                  ? "border-aurora-cyan/60 ring-1 ring-aurora-cyan/30"
                  : "border-white/10 hover:border-white/30")
              }
              style={{
                background:
                  "linear-gradient(160deg, #0a0e1d 0%, #03040c 100%)",
              }}
            >
              <span className="absolute inset-x-1 bottom-1 truncate text-[9px] text-ink-200">
                {s.title ?? s.quote ?? s.stat?.value ?? s.id}
              </span>
              <span className="absolute right-1 top-1 text-[9px] text-ink-500">{i + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}
