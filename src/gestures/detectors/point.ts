import type { DetectorContext } from "../types";
import { isPointing, L } from "../landmarks";

let zHistory: number[] = [];
let lastTap = 0;
const Z_WINDOW = 7;
const Z_THRESHOLD = 0.014;

function avg(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// Right-hand index point = laser pointer; quick forward thrust = air-tap.
export function detectPointAndTap(ctx: DetectorContext) {
  const hand = ctx.rightHand;
  if (!hand || !isPointing(hand)) {
    zHistory = [];
    return;
  }
  const tip = hand.landmarks[L.INDEX_TIP];
  ctx.emit({
    name: "point",
    phase: "active",
    confidence: 0.85,
    hand: "Right",
    data: { x: tip.x, y: tip.y, z: tip.z },
  });
  zHistory.push(tip.z);
  if (zHistory.length > Z_WINDOW) zHistory.shift();
  if (zHistory.length < Z_WINDOW) return;
  const oldestAvg = avg(zHistory.slice(0, 3));
  const newestAvg = avg(zHistory.slice(-3));
  if (oldestAvg - newestAvg > Z_THRESHOLD && ctx.now - lastTap > 600) {
    lastTap = ctx.now;
    ctx.emit({
      name: "air-tap",
      phase: "active",
      confidence: 0.75,
      hand: "Right",
      data: { x: tip.x, y: tip.y },
    });
  }
}
