/// <reference lib="webworker" />
import {
  FilesetResolver,
  GestureRecognizer,
} from "@mediapipe/tasks-vision";
import { MODEL_URL, WASM_BASE } from "./config";
import type { WorkerInbound, WorkerOutbound } from "./types";

let recognizer: GestureRecognizer | null = null;

const post = (msg: WorkerOutbound) => self.postMessage(msg);

async function init(): Promise<void> {
  try {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    recognizer = await GestureRecognizer.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 1,
    });
    post({ type: "ready" });
  } catch (err) {
    post({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

function handleFrame(bitmap: ImageBitmap, timestamp: number): void {
  if (!recognizer) {
    bitmap.close();
    return;
  }
  try {
    const res = recognizer.recognizeForVideo(bitmap, timestamp);
    const top = res.gestures?.[0]?.[0];
    const wrist = res.landmarks?.[0]?.[0];
    const indexTip = res.landmarks?.[0]?.[8];
    const hand = res.handedness?.[0]?.[0];
    post({
      type: "result",
      sample: {
        gesture: top?.categoryName ?? "",
        score: top?.score ?? 0,
        wristX: wrist?.x ?? 0.5,
        wristY: wrist?.y ?? 0.5,
        indexX: indexTip?.x ?? 0.5,
        indexY: indexTip?.y ?? 0.5,
        handedness: hand?.categoryName ?? "",
        timestamp,
      },
    });
  } catch {
    // A single dropped frame is harmless; never let it kill the worker.
  } finally {
    bitmap.close();
  }
}

self.onmessage = (e: MessageEvent<WorkerInbound>) => {
  const msg = e.data;
  if (msg.type === "init") void init();
  else if (msg.type === "frame") handleFrame(msg.bitmap, msg.timestamp);
};
