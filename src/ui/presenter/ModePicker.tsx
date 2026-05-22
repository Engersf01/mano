"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Aperture, Rewind, Layers3, Brain, CheckCircle2 } from "lucide-react";
import { pickerState } from "@/gestures/pickerState";
import { useSceneStore, MODE_BY_FINGER, type SceneMode } from "@/store/scene";
import { cn } from "@/lib/utils";

const OPTIONS: { finger: number; mode: SceneMode; label: string; Icon: typeof Aperture }[] = [
  { finger: 1, mode: "classic", label: "Classic", Icon: Aperture },
  { finger: 2, mode: "timeline", label: "Timeline", Icon: Rewind },
  { finger: 3, mode: "zoom", label: "Zoom", Icon: Layers3 },
  { finger: 4, mode: "brain", label: "Brain", Icon: Brain },
];

export function ModePicker() {
  const currentMode = useSceneStore((s) => s.mode);
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [flash, setFlash] = useState<SceneMode | null>(null);

  useEffect(() => {
    let raf = 0;
    let lastConfirm = 0;
    const tick = () => {
      // Primitive setState calls bail out when unchanged, so this is cheap.
      setVisible(pickerState.visible);
      setCount(pickerState.count);
      setProgress(pickerState.progress);
      if (pickerState.justConfirmed && pickerState.justConfirmed !== lastConfirm) {
        lastConfirm = pickerState.justConfirmed;
        const mode = MODE_BY_FINGER[pickerState.count];
        if (mode) {
          setFlash(mode);
          window.setTimeout(() => setFlash(null), 900);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const show = visible || flash !== null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center"
        >
          <div className="absolute inset-0 bg-ink-950/55 backdrop-blur-md" />
          <div className="relative mb-6 text-center">
            <div className="text-[11px] uppercase tracking-[0.3em] text-aurora-violet">
              Left hand · choose a view
            </div>
            <div className="mt-1 text-sm text-ink-300">
              Hold the number of fingers steady to lock it in
            </div>
          </div>
          <div className="relative flex gap-4">
            {OPTIONS.map((o) => {
              const isPreview = count === o.finger;
              const isCurrent = currentMode === o.mode;
              const isFlash = flash === o.mode;
              return (
                <div
                  key={o.mode}
                  className={cn(
                    "relative flex h-40 w-40 flex-col items-center justify-center gap-3 rounded-3xl border backdrop-blur-2xl transition-colors",
                    isFlash
                      ? "border-emerald-400/80 bg-emerald-400/10"
                      : isPreview
                        ? "border-aurora-violet/80 bg-aurora-violet/10"
                        : isCurrent
                          ? "border-aurora-cyan/40 bg-aurora-cyan/[0.06]"
                          : "border-white/10 bg-ink-900/70",
                  )}
                >
                  {/* dwell progress ring */}
                  {isPreview && progress > 0 && (
                    <svg
                      className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="46"
                        fill="none"
                        stroke="#a570ff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 46}
                        strokeDashoffset={2 * Math.PI * 46 * (1 - progress)}
                        opacity={0.9}
                      />
                    </svg>
                  )}
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl",
                      isPreview ? "text-aurora-violet" : "text-ink-200",
                    )}
                  >
                    <o.Icon size={26} />
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white">{o.label}</div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-400">
                      {o.finger} finger{o.finger > 1 ? "s" : ""}
                    </div>
                  </div>
                  {isFlash && (
                    <span className="absolute right-2 top-2 text-emerald-400">
                      <CheckCircle2 size={18} />
                    </span>
                  )}
                  {isCurrent && !isPreview && !isFlash && (
                    <span className="absolute right-2 top-2 text-[9px] uppercase tracking-wider text-aurora-cyan">
                      current
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
