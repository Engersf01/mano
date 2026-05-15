import type { DetectorContext } from "../types";
import { pinchDistance, handSize, palmCenter } from "../landmarks";

type State = "idle" | "active";
const state = new Map<string, { s: State; since: number; lastEnd: number }>();
const PINCH_RATIO = 0.32;
const RELEASE_RATIO = 0.5;
const DOUBLE_MS = 420;

export function detectPinch(ctx: DetectorContext) {
  for (const hand of [ctx.primary, ctx.secondary]) {
    if (!hand) continue;
    const key = hand.handedness;
    const st = state.get(key) ?? { s: "idle", since: 0, lastEnd: 0 };
    const ratio = pinchDistance(hand) / (handSize(hand) || 1);
    const center = palmCenter(hand);

    if (st.s === "idle" && ratio < PINCH_RATIO) {
      st.s = "active";
      st.since = ctx.now;
      ctx.emit({
        name: "pinch",
        phase: "start",
        confidence: 0.9,
        hand: key,
        data: { x: center.x, y: center.y, ratio },
      });
    } else if (st.s === "active" && ratio > RELEASE_RATIO) {
      st.s = "idle";
      const heldSince = st.since;
      const justEnded = ctx.now;
      const durationMs = justEnded - heldSince;
      ctx.emit({
        name: "pinch",
        phase: "end",
        confidence: 0.9,
        hand: key,
        data: { x: center.x, y: center.y, ratio, durationMs },
      });
      // A brief pinch + release is treated as an "air-tap" (Vision-Pro style click).
      if (durationMs < 260) {
        ctx.emit({
          name: "air-tap",
          phase: "active",
          confidence: 0.9,
          hand: key,
          data: { x: center.x, y: center.y, durationMs },
        });
      }
      if (justEnded - st.lastEnd < DOUBLE_MS) {
        ctx.emit({
          name: "double-pinch",
          phase: "active",
          confidence: 0.85,
          hand: key,
          data: { x: center.x, y: center.y },
        });
        st.lastEnd = 0;
      } else {
        st.lastEnd = justEnded;
      }
    } else if (st.s === "active") {
      ctx.emit({
        name: "pinch",
        phase: "active",
        confidence: 0.9,
        hand: key,
        data: { x: center.x, y: center.y, ratio },
      });
    }
    state.set(key, st);
  }
}
