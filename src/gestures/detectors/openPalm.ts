import type { DetectorContext } from "../types";
import { isOpenPalm } from "../landmarks";

const holdSince = new Map<string, number>();
const fired = new Map<string, number>();

export function detectOpenPalm(ctx: DetectorContext) {
  for (const hand of [ctx.primary, ctx.secondary]) {
    if (!hand) continue;
    const key = hand.handedness;
    if (isOpenPalm(hand)) {
      const since = holdSince.get(key) ?? ctx.now;
      holdSince.set(key, since);
      const last = fired.get(key) ?? 0;
      if (ctx.now - since > 350 && ctx.now - last > 2000) {
        fired.set(key, ctx.now);
        ctx.emit({
          name: "open-palm",
          phase: "active",
          confidence: 0.85,
          hand: key,
        });
      }
    } else {
      holdSince.delete(key);
    }
  }
}
