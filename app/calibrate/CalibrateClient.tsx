"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Hand,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useGestureStore } from "@/store/gesture";
import { useHandTracking } from "@/perception/useHandTracking";
import { startCamera, stopStream } from "@/lib/webcam";
import { HandsOverlay } from "@/scenes/primitives/HandsOverlay";

const GESTURES = [
  ["Swipe", "Next / previous slide"],
  ["Pinch", "Grab and draw"],
  ["Fist → open", "Drop a sticky"],
  ["Two-hand pinch", "Zoom and rotate"],
  ["Point", "Laser pointer"],
  ["Open palm (hold)", "Open the radial menu"],
];

export default function CalibratePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ready = useGestureStore((s) => s.ready);
  const fps = useGestureStore((s) => s.fps);
  const frame = useGestureStore((s) => s.frame);
  const error = useGestureStore((s) => s.error);
  const [handSeenAt, setHandSeenAt] = useState<number | null>(null);

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
        // surfaced via store error
      }
    })();
    return () => {
      cancelled = true;
      stopStream(streamRef.current);
    };
  }, []);

  useHandTracking({ enabled: true, videoRef });

  useEffect(() => {
    if ((frame?.hands.length ?? 0) > 0 && !handSeenAt) {
      setHandSeenAt(Date.now());
    }
  }, [frame, handSeenAt]);

  const handCount = frame?.hands.length ?? 0;
  const detectionWorking = ready && handSeenAt !== null;

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
          className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-aurora-cyan to-aurora-violet px-4 py-2 text-sm font-medium text-ink-950 transition-transform hover:scale-[1.02]"
        >
          Enter the stage <ArrowRight size={14} />
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
                {ready
                  ? `tracking · ${fps}fps · ${handCount} hand${handCount === 1 ? "" : "s"}`
                  : "loading model"}
              </span>
            </div>
            {error && (
              <div className="absolute bottom-3 left-3 right-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                <AlertTriangle size={14} className="mt-px flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5 backdrop-blur-3xl">
            <div className="text-[11px] uppercase tracking-[0.25em] text-ink-400">
              Setup check
            </div>
            <h2 className="mt-1 font-display text-2xl tracking-tight text-white">
              {detectionWorking ? "You're all set" : "Hold up a hand"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-200">
              {detectionWorking
                ? "We can see your hand and the model is tracking smoothly. You can practice the gesture vocabulary on the stage."
                : "Make sure the camera can see your hand. We just need to confirm tracking works — no specific gesture required."}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <AnimatePresence mode="wait">
                {detectionWorking ? (
                  <motion.span
                    key="ok"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300"
                  >
                    <CheckCircle2 size={12} /> tracking confirmed
                  </motion.span>
                ) : (
                  <motion.span
                    key="wait"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-300"
                  >
                    <Sparkles size={12} className="animate-pulse" /> waiting for hand
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <Link
              href="/present"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-aurora-cyan/15 px-3 py-3 text-sm font-medium text-aurora-cyan hover:bg-aurora-cyan/25"
            >
              Enter the stage <ArrowRight size={14} />
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-4 backdrop-blur-3xl">
            <div className="mb-3 text-[11px] uppercase tracking-[0.25em] text-ink-400">
              Gesture cheat sheet
            </div>
            <ul className="space-y-2">
              {GESTURES.map(([g, l]) => (
                <li key={g} className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-white">{g}</span>
                  <span className="text-xs text-ink-400">{l}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-ink-500">
              All gestures are forgiving — there are keyboard / mouse fallbacks
              on the stage too (arrow keys for navigation, click the dock).
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
