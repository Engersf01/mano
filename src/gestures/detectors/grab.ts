import type { DetectorContext } from "../types";
import { isFist, isOpenPalm, palmCenter } from "../landmarks";

// Right-hand fist -> open is the canonical "drop" (air-tap) gesture.
let state: { s: "idle" | "grabbing"; since: number } = { s: "idle", since: 0 };

export function detectGrab(ctx: DetectorContext) {
  const hand = ctx.rightHand;
  if (!hand) return;
  const center = palmCenter(hand);

  if (state.s === "idle" && isFist(hand)) {
    state = { s: "grabbing", since: ctx.now };
    ctx.emit({
      name: "grab",
      phase: "start",
      confidence: 0.85,
      hand: "Right",
      data: { x: center.x, y: center.y },
    });
  } else if (state.s === "grabbing" && isOpenPalm(hand)) {
    const duration = ctx.now - state.since;
    state = { s: "idle", since: 0 };
    ctx.emit({
      name: "release",
      phase: "active",
      confidence: 0.9,
      hand: "Right",
      data: { x: center.x, y: center.y, durationMs: duration },
    });
    if (duration < 900) {
      ctx.emit({
        name: "air-tap",
        phase: "active",
        confidence: 0.92,
        hand: "Right",
        data: { x: center.x, y: center.y, durationMs: duration },
      });
    }
  } else if (state.s === "grabbing") {
    ctx.emit({
      name: "grab",
      phase: "active",
      confidence: 0.85,
      hand: "Right",
      data: { x: center.x, y: center.y },
    });
  }
}
