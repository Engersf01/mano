import type { DetectorContext } from "../types";
import { isFist, isOpenPalm, palmCenter } from "../landmarks";

type State = "idle" | "grabbing";
const state = new Map<string, { s: State; since: number }>();

export function detectGrab(ctx: DetectorContext) {
  for (const hand of [ctx.primary, ctx.secondary]) {
    if (!hand) continue;
    const key = hand.handedness;
    const cur = state.get(key) ?? { s: "idle", since: 0 };
    const center = palmCenter(hand);

    if (cur.s === "idle" && isFist(hand)) {
      state.set(key, { s: "grabbing", since: ctx.now });
      ctx.emit({
        name: "grab",
        phase: "start",
        confidence: 0.85,
        hand: key,
        data: { x: center.x, y: center.y },
      });
    } else if (cur.s === "grabbing" && isOpenPalm(hand)) {
      const duration = ctx.now - cur.since;
      state.set(key, { s: "idle", since: 0 });
      ctx.emit({
        name: "release",
        phase: "active",
        confidence: 0.9,
        hand: key,
        data: { x: center.x, y: center.y, durationMs: duration },
      });
      // A quick grab-and-release is the canonical "drop" gesture — emit
      // an air-tap so all downstream intents (sticky drop, select, click)
      // trigger off this very natural motion.
      if (duration < 900) {
        ctx.emit({
          name: "air-tap",
          phase: "active",
          confidence: 0.92,
          hand: key,
          data: { x: center.x, y: center.y, durationMs: duration },
        });
      }
    } else if (cur.s === "grabbing") {
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
