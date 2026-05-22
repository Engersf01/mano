// Shared MediaPipe GestureRecognizer config. Used by both the worker and the
// main-thread fallback so their WASM/model/version always match.

export const VISION_VERSION = "0.10.14";

export const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/wasm`;

export const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";
