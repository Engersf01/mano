import type { DetectorContext } from "../types";
import { isPointing, L } from "../landmarks";

const zHistory = new Map<string, number[]>();
const lastTap = new Map<string, number>();
const Z_WINDOW = 5;
const Z_THRESHOLD = 0.022;

export function detectPointAndTap(ctx: DetectorContext) {
  for (const hand of [ctx.primary, ctx.secondary]) {
    if (!hand) continue;
    if (!isPointing(hand)) {
      zHistory.delete(hand.handedness);
      continue;
    }
    const tip = hand.landmarks[L.INDEX_TIP];
    const key = hand.handedness;
    ctx.emit({
      name: "point",
      phase: "active",
      confidence: 0.85,
      hand: key,
      data: { x: tip.x, y: tip.y, z: tip.z },
    });
    const arr = zHistory.get(key) ?? [];
    arr.push(tip.z);
    if (arr.length > Z_WINDOW) arr.shift();
    zHistory.set(key, arr);
    if (arr.length < Z_WINDOW) continue;
    const oldest = arr[0];
    const last = lastTap.get(key) ?? 0;
    if (oldest - tip.z > Z_THRESHOLD && ctx.now - last > 700) {
      lastTap.set(key, ctx.now);
      ctx.emit({
        name: "air-tap",
        phase: "active",
        confidence: 0.8,
        hand: key,
        data: { x: tip.x, y: tip.y },
      });
    }
  }
}
