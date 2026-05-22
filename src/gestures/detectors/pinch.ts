import type { DetectorContext } from "../types";
import { pinchDistance, handSize, palmCenter } from "../landmarks";

type St = "idle" | "active";
let state: { s: St; since: number; lastEnd: number } = {
  s: "idle",
  since: 0,
  lastEnd: 0,
};
const PINCH_RATIO = 0.32;
const RELEASE_RATIO = 0.5;
const DOUBLE_MS = 420;

// Right-hand pinch drives drawing. Two-hand zoom is handled separately.
export function detectPinch(ctx: DetectorContext) {
  const hand = ctx.rightHand;
  if (!hand) return;
  const ratio = pinchDistance(hand) / (handSize(hand) || 1);
  const center = palmCenter(hand);

  if (state.s === "idle" && ratio < PINCH_RATIO) {
    state.s = "active";
    state.since = ctx.now;
    ctx.emit({
      name: "pinch",
      phase: "start",
      confidence: 0.9,
      hand: "Right",
      data: { x: center.x, y: center.y, ratio },
    });
  } else if (state.s === "active" && ratio > RELEASE_RATIO) {
    state.s = "idle";
    const justEnded = ctx.now;
    const durationMs = justEnded - state.since;
    ctx.emit({
      name: "pinch",
      phase: "end",
      confidence: 0.9,
      hand: "Right",
      data: { x: center.x, y: center.y, ratio, durationMs },
    });
    if (durationMs < 500) {
      ctx.emit({
        name: "air-tap",
        phase: "active",
        confidence: 0.9,
        hand: "Right",
        data: { x: center.x, y: center.y, durationMs },
      });
    }
    if (justEnded - state.lastEnd < DOUBLE_MS) {
      ctx.emit({
        name: "double-pinch",
        phase: "active",
        confidence: 0.85,
        hand: "Right",
        data: { x: center.x, y: center.y },
      });
      state.lastEnd = 0;
    } else {
      state.lastEnd = justEnded;
    }
  } else if (state.s === "active") {
    ctx.emit({
      name: "pinch",
      phase: "active",
      confidence: 0.9,
      hand: "Right",
      data: { x: center.x, y: center.y, ratio },
    });
  }
}
