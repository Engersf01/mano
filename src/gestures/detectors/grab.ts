import type { DetectorContext } from "../types";
import { isFist, isOpenPalm, palmCenter } from "../landmarks";

const state = new Map<string, "idle" | "grabbing">();

export function detectGrab(ctx: DetectorContext) {
  for (const hand of [ctx.primary, ctx.secondary]) {
    if (!hand) continue;
    const key = hand.handedness;
    const cur = state.get(key) ?? "idle";
    const center = palmCenter(hand);
    if (cur === "idle" && isFist(hand)) {
      state.set(key, "grabbing");
      ctx.emit({
        name: "grab",
        phase: "start",
        confidence: 0.85,
        hand: key,
        data: { x: center.x, y: center.y },
      });
    } else if (cur === "grabbing" && isOpenPalm(hand)) {
      state.set(key, "idle");
      ctx.emit({
        name: "release",
        phase: "active",
        confidence: 0.85,
        hand: key,
        data: { x: center.x, y: center.y },
      });
    } else if (cur === "grabbing") {
      ctx.emit({
        name: "grab",
        phase: "active",
        confidence: 0.85,
        hand: key,
        data: { x: center.x, y: center.y },
      });
    }
  }
}
