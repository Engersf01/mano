import type { DetectorContext } from "../types";
import { L, isPointing } from "../landmarks";

const samples = new Map<string, { x: number; y: number; t: number }[]>();
const lastFire = new Map<string, number>();
const WINDOW = 600;
const MIN_RADIUS = 0.04;
const COOLDOWN = 800;

export function detectCircle(ctx: DetectorContext) {
  for (const hand of [ctx.primary, ctx.secondary]) {
    if (!hand || !isPointing(hand)) continue;
    const key = hand.handedness;
    const tip = hand.landmarks[L.INDEX_TIP];
    const arr = samples.get(key) ?? [];
    arr.push({ x: tip.x, y: tip.y, t: ctx.now });
    while (arr.length && ctx.now - arr[0].t > WINDOW) arr.shift();
    samples.set(key, arr);
    if (arr.length < 12) continue;

    const cx = arr.reduce((s, p) => s + p.x, 0) / arr.length;
    const cy = arr.reduce((s, p) => s + p.y, 0) / arr.length;
    let rs = 0;
    let totalAng = 0;
    let prev = Math.atan2(arr[0].y - cy, arr[0].x - cx);
    for (let i = 1; i < arr.length; i++) {
      const a = Math.atan2(arr[i].y - cy, arr[i].x - cx);
      let d = a - prev;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      totalAng += d;
      prev = a;
      rs += Math.hypot(arr[i].x - cx, arr[i].y - cy);
    }
    const radius = rs / arr.length;
    const last = lastFire.get(key) ?? 0;
    if (Math.abs(totalAng) > 2 * Math.PI * 0.85 && radius > MIN_RADIUS && ctx.now - last > COOLDOWN) {
      lastFire.set(key, ctx.now);
      ctx.emit({
        name: "circle",
        phase: "active",
        confidence: 0.8,
        hand: key,
        data: { cx, cy, radius, direction: Math.sign(totalAng) },
      });
      samples.set(key, []);
    }
  }
}
