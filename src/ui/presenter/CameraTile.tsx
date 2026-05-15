"use client";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useSceneStore } from "@/store/scene";
import { useGestureStore } from "@/store/gesture";
import { useHandTracking } from "@/perception/useHandTracking";
import { startCamera, stopStream } from "@/lib/webcam";
import { HandsOverlay } from "@/scenes/primitives/HandsOverlay";
import { usePresenterStore } from "@/store/presenter";

export function CameraTile() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const showHands = useSceneStore((s) => s.showHands);
  const setPermission = usePresenterStore((s) => s.setPermission);
  const setError = useGestureStore((s) => s.setError);
  const ready = useGestureStore((s) => s.ready);
  const lastEvent = useGestureStore((s) => s.lastEvent);

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
        setPermission("camera", "granted");
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
      } catch (err) {
        setPermission("camera", "denied");
        setError(err instanceof Error ? err.message : "Camera access denied");
      }
    })();
    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [setPermission, setError]);

  useHandTracking({ enabled: true, videoRef });

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 220, damping: 24 }}
      className="pointer-events-auto absolute right-4 top-4 z-40 w-[300px] overflow-hidden rounded-2xl border border-white/10 bg-ink-900/70 backdrop-blur-3xl shadow-glow"
    >
      <div className="relative aspect-video w-full overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
        />
        {showHands && <HandsOverlay mirror />}
        <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-ink-950/70 px-2 py-1 text-[10px] uppercase tracking-wider">
          <span
            className={
              "h-1.5 w-1.5 rounded-full " + (ready ? "bg-emerald-400" : "bg-amber-400")
            }
          />
          <span className="text-ink-200">{ready ? "tracking" : "warming up"}</span>
        </div>
      </div>
      <div className="border-t border-white/5 px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wider text-ink-400">Last gesture</span>
          {lastEvent ? (
            <span className="font-mono text-xs text-aurora-cyan">
              {lastEvent.name} · {(lastEvent.confidence * 100).toFixed(0)}%
            </span>
          ) : (
            <span className="text-xs text-ink-500">—</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
