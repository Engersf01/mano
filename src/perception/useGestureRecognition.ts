import { useEffect, type RefObject } from "react";
import { setLiveStats } from "./liveStats";
import { createSwipeDetector, type SwipeDirection } from "@/gestures/swipe";
import type { WorkerInbound, WorkerOutbound } from "./types";

const INPUT_WIDTH = 256; // downscale frames before inference (latency win)
const MIN_FRAME_GAP_MS = 33; // ~30 fps ceiling on what we send the worker

type Options = {
  videoRef: RefObject<HTMLVideoElement>;
  onSwipe: (dir: SwipeDirection) => void;
};

export function useGestureRecognition({ videoRef, onSwipe }: Options): void {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let stream: MediaStream | null = null;
    let worker: Worker | null = null;
    let raf = 0;
    let disposed = false;

    let ready = false;
    let inFlight = false;
    let lastSent = 0;
    let lastTs = 0;
    let lastResultAt = 0;
    let fps = 0;

    const swipe = createSwipeDetector();

    const pump = () => {
      raf = requestAnimationFrame(pump);
      if (!ready || inFlight || !worker) return;

      const now = performance.now();
      if (now - lastSent < MIN_FRAME_GAP_MS) return;
      if (video.readyState < 2 || video.videoWidth === 0) return;

      lastSent = now;
      inFlight = true;
      const h = Math.round((INPUT_WIDTH * video.videoHeight) / video.videoWidth);
      void createImageBitmap(video, {
        resizeWidth: INPUT_WIDTH,
        resizeHeight: h,
        resizeQuality: "low",
      })
        .then((bitmap) => {
          if (disposed || !worker) {
            bitmap.close();
            return;
          }
          // Timestamps fed to MediaPipe must be strictly increasing.
          const ts = Math.max(performance.now(), lastTs + 1);
          lastTs = ts;
          const msg: WorkerInbound = { type: "frame", bitmap, timestamp: ts };
          worker.postMessage(msg, [bitmap]);
        })
        .catch(() => {
          inFlight = false;
        });
    };

    const onMessage = (e: MessageEvent<WorkerOutbound>) => {
      const msg = e.data;
      if (msg.type === "ready") {
        ready = true;
        setLiveStats({ status: "ready" });
        return;
      }
      if (msg.type === "error") {
        setLiveStats({ status: "error", gesture: msg.message });
        return;
      }
      // result
      inFlight = false;
      const now = performance.now();
      if (lastResultAt) {
        const inst = 1000 / Math.max(1, now - lastResultAt);
        fps = fps ? fps * 0.8 + inst * 0.2 : inst;
      }
      lastResultAt = now;

      const s = msg.sample;
      setLiveStats({
        gesture: s.gesture || "none",
        score: s.score,
        fps,
      });

      const dir = swipe.push(s);
      if (dir) onSwipe(dir);
    };

    const start = async () => {
      setLiveStats({ status: "loading" });
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });
        if (disposed) return;
        video.srcObject = stream;
        await video.play();
      } catch {
        setLiveStats({ status: "no-camera" });
        return;
      }

      worker = new Worker(new URL("./gesture.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = onMessage;
      const init: WorkerInbound = { type: "init" };
      worker.postMessage(init);

      raf = requestAnimationFrame(pump);
    };

    void start();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      worker?.terminate();
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
  }, [videoRef, onSwipe]);
}
