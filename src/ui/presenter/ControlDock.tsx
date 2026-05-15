"use client";
import { useDeckStore } from "@/store/deck";
import { useSceneStore, type SceneMode } from "@/store/scene";
import { usePresenterStore } from "@/store/presenter";
import { useGestureStore } from "@/store/gesture";
import { useAIStore } from "@/store/ai";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Sparkles,
  Hand,
  MonitorPlay,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MODES: { key: SceneMode; label: string }[] = [
  { key: "spatial", label: "Spatial" },
  { key: "classic", label: "Classic" },
  { key: "brain", label: "Brain" },
  { key: "globe", label: "Globe" },
  { key: "timeline", label: "Timeline" },
  { key: "zoom", label: "Zoom" },
];

export function ControlDock() {
  const deck = useDeckStore((s) => s.deck);
  const index = useDeckStore((s) => s.index);
  const next = useDeckStore((s) => s.next);
  const prev = useDeckStore((s) => s.prev);
  const mode = useSceneStore((s) => s.mode);
  const setMode = useSceneStore((s) => s.setMode);
  const isPresenting = usePresenterStore((s) => s.isPresenting);
  const start = usePresenterStore((s) => s.start);
  const stop = usePresenterStore((s) => s.stop);
  const showHands = useSceneStore((s) => s.showHands);
  const toggleHands = useSceneStore((s) => s.toggleHands);
  const fps = useGestureStore((s) => s.fps);
  const ready = useGestureStore((s) => s.ready);
  const toggleAi = useAIStore((s) => s.toggle);
  const [openAudience, setOpenAudience] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, stop]);

  if (!deck) return null;

  const launchAudience = () => {
    const w = window.open("/audience", "mano-audience", "popup,width=1600,height=900");
    if (w) setOpenAudience(true);
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 26, delay: 0.2 }}
      className="pointer-events-auto absolute bottom-4 left-1/2 z-40 -translate-x-1/2"
    >
      <div className="flex items-stretch gap-1 rounded-2xl border border-white/10 bg-ink-900/70 p-1.5 backdrop-blur-3xl shadow-glow">
        <button
          onClick={prev}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-200 hover:bg-white/5 hover:text-white"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex h-10 min-w-[120px] items-center justify-center px-3 text-sm tabular-nums">
          <span className="text-white">{index + 1}</span>
          <span className="mx-1 text-ink-400">/</span>
          <span className="text-ink-300">{deck.slides.length}</span>
        </div>
        <button
          onClick={next}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-200 hover:bg-white/5 hover:text-white"
        >
          <ChevronRight size={18} />
        </button>
        <div className="mx-1 h-7 w-px self-center bg-white/10" />
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={cn(
              "rounded-xl px-3 text-[11px] uppercase tracking-wider transition-colors",
              mode === m.key
                ? "bg-aurora-cyan/15 text-aurora-cyan"
                : "text-ink-300 hover:bg-white/5 hover:text-white",
            )}
          >
            {m.label}
          </button>
        ))}
        <div className="mx-1 h-7 w-px self-center bg-white/10" />
        <button
          onClick={toggleHands}
          title={showHands ? "Hide hand overlay" : "Show hand overlay"}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            showHands ? "text-aurora-cyan" : "text-ink-400",
          )}
        >
          <Hand size={16} />
        </button>
        <button
          onClick={toggleAi}
          title="AI assistant"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-200 hover:bg-white/5 hover:text-white"
        >
          <Sparkles size={16} />
        </button>
        <button
          onClick={launchAudience}
          title="Open audience window"
          className={cn(
            "flex h-10 items-center justify-center rounded-xl px-3 text-[11px] uppercase tracking-wider",
            openAudience ? "text-aurora-violet" : "text-ink-200 hover:bg-white/5 hover:text-white",
          )}
        >
          <MonitorPlay size={14} className="mr-1.5" /> Audience
        </button>
        {isPresenting ? (
          <button
            onClick={stop}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 text-[11px] uppercase tracking-wider text-rose-200 hover:bg-rose-500/25"
          >
            <Pause size={14} /> Stop
          </button>
        ) : (
          <button
            onClick={start}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-aurora-cyan/15 px-3 text-[11px] uppercase tracking-wider text-aurora-cyan hover:bg-aurora-cyan/25"
          >
            <Play size={14} /> Present
          </button>
        )}
        <div className="mx-1 h-7 w-px self-center bg-white/10" />
        <div className="flex h-10 items-center gap-2 px-2 text-[10px] uppercase tracking-wider text-ink-400">
          <span
            className={cn("h-1.5 w-1.5 rounded-full", ready ? "bg-emerald-400" : "bg-amber-400")}
          />
          <span>{ready ? `${fps} fps` : "Init"}</span>
        </div>
      </div>
    </motion.div>
  );
}
