import { useEffect, type RefObject } from "react";
import { setLiveStats } from "./liveStats";
import { createSwipeDetector, type SwipeDirection } from "@/gestures/swipe";
import { MODEL_URL, WASM_BASE } from "./config";
import type { GestureSample, WorkerInbound, WorkerOutbound } from "./types";
import type { GestureRecognizer } from "@mediapipe/tasks-vision";

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
    let mainRecognizer: GestureRecognizer | null = null;
    let raf = 0;
    let disposed = false;
    let usedFallback = false;

    let ready = false;
    let inFlight = false;
    let lastSent = 0;
    let lastTs = 0;
    let lastResultAt = 0;
    let fps = 0;

    const swipe = createSwipeDetector();

    const consumeSample = (s: GestureSample) => {
      const now = performance.now();
      if (lastResultAt) {
        const inst = 1000 / Math.max(1, now - lastResultAt);
        fps = fps ? fps * 0.8 + inst * 0.2 : inst;
      }
      lastResultAt = now;
      setLiveStats({ gesture: s.gesture || "none", score: s.score, fps });
      const dir = swipe.push(s);
      if (dir) onSwipe(dir);
    };

    // ---- Worker path: fast, keeps inference off the main thread (desktop) ----
    const pump = () => {
      if (disposed || usedFallback) return; // stop the loop, don't reschedule
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
        // Web Workers have no `document`. On browsers where MediaPipe's worker
        // GL path reaches for it (notably iOS Safari) init throws here. Retry
        // on the main thread, which does have `document`.
        worker?.terminate();
        worker = null;
        void startMainThread();
        return;
      }
      inFlight = false;
      consumeSample(msg.sample);
    };

    // ---- Main-thread fallback: slower, but works where the worker can't ----
    const mainPump = () => {
      if (disposed) return;
      raf = requestAnimationFrame(mainPump);
      if (!mainRecognizer) return;

      const now = performance.now();
      if (now - lastSent < MIN_FRAME_GAP_MS) return;
      if (video.readyState < 2 || video.videoWidth === 0) return;

      lastSent = now;
      const ts = Math.max(performance.now(), lastTs + 1);
      lastTs = ts;
      try {
        const res = mainRecognizer.recognizeForVideo(video, ts);
        const top = res.gestures?.[0]?.[0];
        const wrist = res.landmarks?.[0]?.[0];
        const hand = res.handedness?.[0]?.[0];
        consumeSample({
          gesture: top?.categoryName ?? "",
          score: top?.score ?? 0,
          wristX: wrist?.x ?? 0.5,
          wristY: wrist?.y ?? 0.5,
          handedness: hand?.categoryName ?? "",
          timestamp: ts,
        });
      } catch {
        // A single dropped frame is harmless; never let it kill the loop.
      }
    };

    const startMainThread = async () => {
      if (usedFallback || disposed) return;
      usedFallback = true;
      setLiveStats({ status: "loading" });
      try {
        // Lazy import so the recognizer never enters the main bundle on
        // browsers that succeed with the worker.
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
        const recognizer = await vision.GestureRecognizer.createFromOptions(
          fileset,
          {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
            runningMode: "VIDEO",
            numHands: 1,
          },
        );
        if (disposed) {
          recognizer.close();
          return;
        }
        mainRecognizer = recognizer;
        setLiveStats({ status: "ready" });
        raf = requestAnimationFrame(mainPump);
      } catch (err) {
        setLiveStats({
          status: "error",
          gesture: err instanceof Error ? err.message : String(err),
        });
      }
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
      mainRecognizer?.close();
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
  }, [videoRef, onSwipe]);
}
