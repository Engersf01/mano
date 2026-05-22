"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGestureStore } from "@/store/gesture";
import { useSceneStore, MODE_LABELS, type SceneMode } from "@/store/scene";
import { cn } from "@/lib/utils";

const RIGHT_HAND = [
  ["Swipe ←/→", "Prev / next slide"],
  ["Pinch + drag", "Draw"],
  ["Point", "Laser pointer"],
  ["Fist → open", "Drop sticky"],
];

const LEFT_HAND: { finger: string; mode: SceneMode }[] = [
  { finger: "1", mode: "classic" },
  { finger: "2", mode: "timeline" },
  { finger: "3", mode: "zoom" },
  { finger: "4", mode: "brain" },
];

export function GestureGuide() {
  const [open, setOpen] = useState(true);
  const mode = useSceneStore((s) => s.mode);
  const lastEvent = useGestureStore((s) => s.lastEvent);

  // Auto-collapse after 12s so it doesn't clutter the stage.
  useEffect(() => {
    const t = setTimeout(() => setOpen(false), 12000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="pointer-events-auto absolute bottom-20 left-4 z-30">
      <button
        onClick={() => setOpen((o) => !o)}
        className="mb-2 rounded-lg border border-white/10 bg-ink-900/70 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-ink-300 backdrop-blur-2xl hover:text-white"
      >
        {open ? "Hide gestures" : "Gestures"}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="w-[280px] space-y-3 rounded-2xl border border-white/10 bg-ink-900/70 p-4 backdrop-blur-3xl"
          >
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-aurora-cyan">
                Right hand · actions
              </div>
              <ul className="space-y-1.5">
                {RIGHT_HAND.map(([g, d]) => (
                  <li key={g} className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-white">{g}</span>
                    <span className="text-[11px] text-ink-400">{d}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="h-px bg-white/10" />
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-aurora-violet">
                Left hand · view (hold fingers up)
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {LEFT_HAND.map(({ finger, mode: m }) => (
                  <div
                    key={finger}
                    className={cn(
                      "rounded-lg border px-1 py-1.5 text-center",
                      mode === m
                        ? "border-aurora-violet/60 bg-aurora-violet/10 text-aurora-violet"
                        : "border-white/10 text-ink-300",
                    )}
                  >
                    <div className="text-base font-semibold">{finger}</div>
                    <div className="text-[9px] uppercase tracking-wide">
                      {MODE_LABELS[m]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-500">
              <span>Both hands pinch + spread = zoom</span>
            </div>
            {lastEvent && (
              <div className="rounded-lg bg-white/[0.03] px-2 py-1 text-center font-mono text-[10px] text-ink-400">
                last: {lastEvent.name}
                {lastEvent.hand ? ` · ${lastEvent.hand}` : ""}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
