/// <reference lib="webworker" />
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { WorkerInbound, WorkerOutbound, Hand } from "./types";

let landmarker: HandLandmarker | null = null;
let busy = false;

const post = (msg: WorkerOutbound, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(msg, transfer);

async function init(wasmBase: string) {
  const fileset = await FilesetResolver.forVisionTasks(wasmBase);
  landmarker = await HandLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
  });
  post({ type: "ready" });
}

function toHands(result: HandLandmarkerResult): Hand[] {
  const hands: Hand[] = [];
  const count = result.landmarks.length;
  for (let i = 0; i < count; i++) {
    const handed = result.handednesses[i]?.[0];
    hands.push({
      handedness: (handed?.categoryName as "Left" | "Right") ?? "Right",
      score: handed?.score ?? 0,
      landmarks: result.landmarks[i].map((p) => ({ x: p.x, y: p.y, z: p.z })),
      worldLandmarks:
        result.worldLandmarks[i]?.map((p) => ({ x: p.x, y: p.y, z: p.z })) ?? [],
    });
  }
  return hands;
}

self.addEventListener("message", async (e: MessageEvent<WorkerInbound>) => {
  const msg = e.data;
  try {
    if (msg.type === "init") {
      await init(msg.wasmBase);
      return;
    }
    if (msg.type === "frame") {
      if (!landmarker || busy) {
        msg.bitmap.close();
        return;
      }
      busy = true;
      const result = landmarker.detectForVideo(msg.bitmap, msg.t);
      msg.bitmap.close();
      post({
        type: "frame",
        payload: {
          t: msg.t,
          width: msg.width,
          height: msg.height,
          hands: toHands(result),
        },
      });
      busy = false;
      return;
    }
    if (msg.type === "dispose") {
      landmarker?.close();
      landmarker = null;
      return;
    }
  } catch (err) {
    busy = false;
    post({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
});
