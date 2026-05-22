import type { HandFrame, Hand } from "@/perception/types";

export type GestureName =
  | "swipe-left"
  | "swipe-right"
  | "pinch"
  | "double-pinch"
  | "grab"
  | "release"
  | "point"
  | "air-tap"
  | "two-hand-zoom"
  | "two-hand-rotate"
  | "open-palm"
  | "circle"
  | "flick-down"
  | "mode-select";

export type GesturePhase = "start" | "active" | "end";

export type GestureEvent = {
  name: GestureName;
  phase: GesturePhase;
  t: number;
  confidence: number;
  hand?: "Left" | "Right";
  data?: Record<string, number>;
};

export type GestureListener = (e: GestureEvent) => void;

export type HandSnapshot = {
  t: number;
  frame: HandFrame;
  rightHand: Hand | null;
  leftHand: Hand | null;
};

export type DetectorContext = {
  frame: HandFrame;
  rightHand: Hand | null;
  leftHand: Hand | null;
  history: HandSnapshot[];
  emit: (e: Omit<GestureEvent, "t">) => void;
  now: number;
  settings: GestureSettings;
};

export type GestureSettings = {
  swipeSpeed: number;
  pinchDistance: number;
  cooldownMs: number;
  confidenceFloor: number;
  deadZone: number;
  enabled: boolean;
};

export const DEFAULT_SETTINGS: GestureSettings = {
  swipeSpeed: 0.8,
  pinchDistance: 0.06,
  cooldownMs: 350,
  confidenceFloor: 0.4,
  deadZone: 0.12,
  enabled: true,
};
