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
    let lastT: number | null = null;

    const onFrame = (frame: HandFrame) => {
      frames++;
      const now = performance.now();
      if (now - fpsT > 1000) {
        setFps(Math.round((frames * 1000) / (now - fpsT)));
        frames = 0;
        fpsT = now;
      }
      setHands(frame);
      engine.tick(frame);
    };

    worker.postMessage({ type: "init", wasmBase: WASM_BASE });

    const pump = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(pump);
        return;
      }
      const t = performance.now();
      if (t - lastSentRef.current < 33) {
        rafRef.current = requestAnimationFrame(pump);
        return;
      }
      lastSentRef.current = t;
      try {
        const bitmap = await createImageBitmap(video);
        worker.postMessage(
          {
            type: "frame",
            bitmap,
            t,
            width: video.videoWidth,
            height: video.videoHeight,
          },
          [bitmap],
        );
        lastT = t;
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
