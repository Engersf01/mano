// Messages exchanged between the main thread and the gesture worker.

export type WorkerInbound =
  | { type: "init" }
  | { type: "frame"; bitmap: ImageBitmap; timestamp: number };

export type GestureSample = {
  // Canonical GestureRecognizer category, e.g. "Open_Palm", "Closed_Fist",
  // "None". Empty string when no hand is present.
  gesture: string;
  score: number;
  // Wrist position (landmark 0) in normalized raw-image coordinates [0,1].
  // Raw means NOT selfie-mirrored — callers must mirror for screen space.
  wristX: number;
  wristY: number;
  // Index fingertip (landmark 8), same raw coordinate convention as the wrist.
  // Used as the pen tip for gesture drawing.
  indexX: number;
  indexY: number;
  // MediaPipe's mirror-relative handedness label ("Left" | "Right" | "").
  handedness: string;
  timestamp: number;
};

export type WorkerOutbound =
  | { type: "ready" }
  | { type: "error"; message: string }
  | { type: "result"; sample: GestureSample };
