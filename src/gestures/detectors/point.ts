import type { DetectorContext } from "../types";
import { isPointing, L } from "../landmarks";

const lastZ = new Map<string, number>();
const lastTap = new Map<string, number>();

export function detectPointAndTap(ctx: DetectorContext) {
  for (const hand of [ctx.primary, ctx.secondary]) {
    if (!hand) continue;
    if (!isPointing(hand)) continue;
    const tip = hand.landmarks[L.INDEX_TIP];
    const key = hand.handedness;
    ctx.emit({
      name: "point",
      phase: "active",
      confidence: 0.85,
      hand: key,
      data: { x: tip.x, y: tip.y, z: tip.z },
    });
    const prevZ = lastZ.get(key);
    lastZ.set(key, tip.z);
    if (prevZ === undefined) continue;
    const dz = tip.z - prevZ;
    const lastT = lastTap.get(key) ?? 0;
    if (dz < -0.04 && ctx.now - lastT > 600) {
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
