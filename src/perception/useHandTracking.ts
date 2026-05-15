"use client";
import { useEffect, useRef } from "react";
import { useGestureStore } from "@/store/gesture";
import { GestureEngine } from "@/gestures/GestureEngine";
import type { WorkerOutbound, HandFrame } from "./types";

type Options = {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
};

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";

export function useHandTracking({ enabled, videoRef }: Options) {
  const workerRef = useRef<Worker | null>(null);
  const engineRef = useRef<GestureEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const setReady = useGestureStore.getState().setReady;
    const setHands = useGestureStore.getState().setHands;
    const setError = useGestureStore.getState().setError;
    const setFps = useGestureStore.getState().setFps;

    const engine = new GestureEngine();
    engineRef.current = engine;

    const worker = new Worker(
      new URL("./hands.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerOutbound>) => {
      const msg = e.data;
      if (msg.type === "ready") setReady(true);
      else if (msg.type === "error") setError(msg.message);
      else if (msg.type === "frame") onFrame(msg.payload);
    };

    let frames = 0;
    let fpsT = performance.now();

    const onFrame = (frame: HandFrame) => {
      frames++;
      const now = performance.now();
      if (now - fpsT > 1000) {
        setFps(Math.round((frames * 1000) / (now - fpsT)));
        frames = 0;
        fpsT = now;
      }
      // Mirror landmarks to match the visually-mirrored camera feed so that
      // all downstream code speaks user-perspective coordinates.
      const mirrored: HandFrame = {
        ...frame,
        hands: frame.hands.map((h) => ({
          ...h,
          landmarks: h.landmarks.map((p) => ({ x: 1 - p.x, y: p.y, z: p.z })),
        })),
      };
      setHands(mirrored);
      engine.tick(mirrored);
    };

    worker.postMessage({ type: "init", wasmBase: WASM_BASE });

    const pump = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(pump);
        return;
      }
      const t = performance.now();
      // Aim for 60fps; the worker's busy flag drops frames it can't service,
      // which gives us as-fast-as-possible inference without overrunning.
      if (t - lastSentRef.current < 14) {
        rafRef.current = requestAnimationFrame(pump);
        return;
      }
      lastSentRef.current = t;
      try {
        // Pre-resize the camera frame to ~384px on the long edge before sending
        // to the worker. MediaPipe rescales internally to its model resolution
        // (~256px) anyway, and the copy cost of a full 1280x720 bitmap was
        // the main thread bottleneck — most visible when both hands appear.
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const long = Math.max(vw, vh);
        const scale = long > 384 ? 384 / long : 1;
        const rw = Math.max(1, Math.round(vw * scale));
        const rh = Math.max(1, Math.round(vh * scale));
        const bitmap = await createImageBitmap(video, {
          resizeWidth: rw,
          resizeHeight: rh,
          resizeQuality: "low",
        });
        worker.postMessage(
          { type: "frame", bitmap, t, width: rw, height: rh },
          [bitmap],
        );
      } catch {
        // video frame not yet available
      }
      rafRef.current = requestAnimationFrame(pump);
    };
    rafRef.current = requestAnimationFrame(pump);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      worker.postMessage({ type: "dispose" });
      worker.terminate();
      workerRef.current = null;
      engineRef.current = null;
      setReady(false);
    };
  }, [enabled, videoRef]);
}
