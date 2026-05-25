"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useDeck } from "@/store/deck";
import { SELFIE_MODEL_URL, WASM_BASE } from "@/perception/config";
import type { ImageSegmenter, MPMask } from "@mediapipe/tasks-vision";

// ~22 fps. Segmentation is heavy; this leaves GPU headroom for the gesture
// recognizer running alongside it.
const MIN_GAP_MS = 45;
const STAGE_HEIGHT = 0.98; // presenter height as a fraction of the viewport

export function PresenterStage({
  videoRef,
}: {
  videoRef: RefObject<HTMLVideoElement>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageMode = useDeck((s) => s.stageMode);

  useEffect(() => {
    if (!stageMode) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const stageCtx = canvas.getContext("2d");
    if (!stageCtx) return;

    let disposed = false;
    let raf = 0;
    let segmenter: ImageSegmenter | null = null;
    let lastTs = 0;
    let lastRun = 0;

    // Offscreen scratch surfaces reused across frames.
    const person = document.createElement("canvas");
    const personCtx = person.getContext("2d")!;
    const maskCanvas = document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d")!;

    const fitStage = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    };
    fitStage();
    window.addEventListener("resize", fitStage);

    const composite = (mask: MPMask) => {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      // 1. Current frame onto the person canvas.
      if (person.width !== vw || person.height !== vh) {
        person.width = vw;
        person.height = vh;
      }
      personCtx.globalCompositeOperation = "source-over";
      personCtx.clearRect(0, 0, vw, vh);
      personCtx.drawImage(video, 0, 0, vw, vh);

      // 2. Confidence mask → an alpha-only canvas.
      const mw = mask.width;
      const mh = mask.height;
      const data = mask.getAsFloat32Array();
      if (maskCanvas.width !== mw || maskCanvas.height !== mh) {
        maskCanvas.width = mw;
        maskCanvas.height = mh;
      }
      const img = maskCtx.createImageData(mw, mh);
      for (let i = 0; i < data.length; i++) {
        img.data[i * 4 + 3] = data[i] * 255;
      }
      maskCtx.putImageData(img, 0, 0);

      // 3. Keep only the person (mask scaled up smoothly = feathered edges).
      personCtx.globalCompositeOperation = "destination-in";
      personCtx.drawImage(maskCanvas, 0, 0, mw, mh, 0, 0, vw, vh);
      personCtx.globalCompositeOperation = "source-over";

      // 4. Draw the cutout onto the stage: full height, mirrored (selfie),
      //    anchored to the bottom-right so the slide shows beside the speaker.
      const cw = canvas.width;
      const ch = canvas.height;
      stageCtx.clearRect(0, 0, cw, ch);
      const h = ch * STAGE_HEIGHT;
      const w = h * (vw / vh);
      stageCtx.save();
      stageCtx.translate(cw, ch - h);
      stageCtx.scale(-1, 1);
      stageCtx.drawImage(person, 0, 0, w, h);
      stageCtx.restore();
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!segmenter) return;
      const now = performance.now();
      if (now - lastRun < MIN_GAP_MS) return;
      if (video.readyState < 2 || video.videoWidth === 0) return;
      lastRun = now;
      const ts = Math.max(performance.now(), lastTs + 1);
      lastTs = ts;
      try {
        segmenter.segmentForVideo(video, ts, (result) => {
          const mask = result.confidenceMasks?.[0];
          if (mask) composite(mask);
        });
      } catch {
        // Drop a frame rather than kill the loop.
      }
    };

    void (async () => {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
        const seg = await vision.ImageSegmenter.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: SELFIE_MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        });
        if (disposed) {
          seg.close();
          return;
        }
        segmenter = seg;
        raf = requestAnimationFrame(tick);
      } catch {
        // If segmentation can't load, the stage simply stays empty.
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fitStage);
      segmenter?.close();
      stageCtx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [stageMode, videoRef]);

  if (!stageMode) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
    />
  );
}
