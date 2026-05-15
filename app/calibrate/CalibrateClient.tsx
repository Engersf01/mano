"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Hand, RotateCcw, SkipForward } from "lucide-react";
import { useGestureStore } from "@/store/gesture";
import { useHandTracking } from "@/perception/useHandTracking";
import { startCamera, stopStream } from "@/lib/webcam";
import { HandsOverlay } from "@/scenes/primitives/HandsOverlay";
import type { GestureName } from "@/gestures/types";

type Step = {
  key: string;
  title: string;
  body: string;
  targets: GestureName[];
  cue: string;
};

const STEPS: Step[] = [
  {
    key: "ready",
    title: "Find your light",
    body:
      "Sit ~70 cm from the camera. Hold an open palm toward the camera with your fingers clearly spread.",
    targets: ["open-palm"],
    cue: "Hold an open palm (fingers spread)",
  },
  {
    key: "swipe",
    title: "Swipe to navigate",
    body:
      "Slide an open palm across the frame. Right = next, left = previous. Either direction works for calibration.",
    targets: ["swipe-right", "swipe-left"],
    cue: "Sweep your hand left or right",
  },
  {
    key: "pinch",
    title: "Pinch to grab",
    body:
      "Touch your thumb and index together. Hold to drag. Release to drop. Double-pinch confirms.",
    targets: ["pinch", "double-pinch"],
    cue: "Pinch thumb and index together",
  },
  {
    key: "two-hand",
    title: "Two-hand zoom",
    body:
      "Pinch with both hands, then move them apart to zoom in or together to zoom out.",
    targets: ["two-hand-zoom", "two-hand-rotate"],
    cue: "Pinch with both hands",
  },
  {
    key: "tap",
    title: "Air-tap to drop",
    body:
      "Two ways — pick whichever feels natural. (A) Briefly touch your thumb and index together and release quickly, like a tiny click. (B) Or point with your index finger and quickly thrust it forward toward the camera.",
    targets: ["air-tap"],
    cue: "Quick pinch-and-release · OR · point and thrust forward",
  },
];

export default function CalibratePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const lastEvent = useGestureStore((s) => s.lastEvent);
  const ready = useGestureStore((s) => s.ready);
  const fps = useGestureStore((s) => s.fps);
  const frame = useGestureStore((s) => s.frame);
  const error = useGestureStore((s) => s.error);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await startCamera();
        if (cancelled) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        // user denied — surfaced via store error
      }
    })();
    return () => {
      cancelled = true;
      stopStream(streamRef.current);
    };
  }, []);

  useHandTracking({ enabled: true, videoRef });

  useEffect(() => {
    if (!lastEvent) return;
    const targets = STEPS[step]?.targets;
    if (!targets) return;
    if (targets.includes(lastEvent.name)) {
      setCompleted((c) => ({ ...c, [STEPS[step].key]: true }));
      const t = setTimeout(
        () => setStep((s) => Math.min(s + 1, STEPS.length - 1)),
        650,
      );
      return () => clearTimeout(t);
    }
  }, [lastEvent, step]);

  const done = Object.keys(completed).length === STEPS.length;
  const handCount = frame?.hands.length ?? 0;
  const skipStep = () => {
    setCompleted((c) => ({ ...c, [STEPS[step].key]: true }));
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="aurora-bg" />
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-ink-200 hover:text-white"
        >
          <Hand size={14} /> Mano
        </Link>
        <Link
          href="/present"
          className="flex items-center gap-1 rounded-xl bg-aurora-cyan/15 px-3 py-1.5 text-sm text-aurora-cyan hover:bg-aurora-cyan/25"
        >
          Skip to stage <ArrowRight size={14} />
        </Link>
      </header>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-6 px-8 pb-12 md:grid-cols-[1fr_400px]">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/50 backdrop-blur-3xl">
          <div className="relative aspect-video">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
            />
            <HandsOverlay />
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-ink-950/70 px-2 py-1 text-[10px] uppercase tracking-wider">
              <span
                className={
                  "h-1.5 w-1.5 rounded-full " +
                  (ready ? "bg-emerald-400" : "bg-amber-400")
                }
              />
              <span className="text-ink-200">
                {ready ? `tracking · ${fps}fps · ${handCount} hand${handCount === 1 ? "" : "s"}` : "loading model"}
              </span>
            </div>
            {lastEvent && (
              <motion.div
                key={`${lastEvent.t}-${lastEvent.name}-${lastEvent.phase}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-aurora-cyan/30 bg-ink-950/80 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-aurora-cyan"
              >
                {lastEvent.name} · {(lastEvent.confidence * 100).toFixed(0)}%
              </motion.div>
            )}
            {error && (
              <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5 backdrop-blur-3xl">
            <div className="text-[11px] uppercase tracking-[0.25em] text-ink-400">
              Step {step + 1} / {STEPS.length}
            </div>
            <h2 className="mt-1 font-display text-2xl tracking-tight text-white">
              {STEPS[step].title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-200">
              {STEPS[step].body}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-aurora-cyan/10 px-3 py-2 text-sm text-aurora-cyan">
              <Hand size={14} /> {STEPS[step].cue}
            </div>
            <div className="mt-3 text-[10px] uppercase tracking-wider text-ink-500">
              Listening for: {STEPS[step].targets.join(" · ")}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-3 backdrop-blur-3xl">
            <div className="mb-2 text-[11px] uppercase tracking-[0.25em] text-ink-400">
              Checklist
            </div>
            <ul className="space-y-1.5">
              {STEPS.map((s, i) => (
                <li
                  key={s.key}
                  className={
                    "flex items-center gap-2 rounded-lg px-2 py-1 text-sm " +
                    (i === step
                      ? "bg-white/[0.04] text-white"
                      : "text-ink-300")
                  }
                >
                  <AnimatePresence mode="wait">
                    {completed[s.key] ? (
                      <motion.span
                        key="done"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-emerald-400"
                      >
                        <CheckCircle2 size={14} />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="pending"
                        className="inline-block h-3 w-3 rounded-full border border-white/30"
                      />
                    )}
                  </AnimatePresence>
                  {s.title}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  setStep(0);
                  setCompleted({});
                }}
                className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-ink-200 hover:bg-white/10"
              >
                <RotateCcw size={12} /> Restart
              </button>
              {!done && (
                <button
                  onClick={skipStep}
                  className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-ink-200 hover:bg-white/10"
                >
                  <SkipForward size={12} /> Skip step
                </button>
              )}
              {done && (
                <Link
                  href="/present"
                  className="ml-auto flex items-center gap-1 rounded-lg bg-aurora-cyan/15 px-3 py-1.5 text-xs text-aurora-cyan hover:bg-aurora-cyan/25"
                >
                  Enter the stage <ArrowRight size={12} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
