import type { DetectorContext, GestureEvent } from "../types";
import { palmCenter, isOpenPalm } from "../landmarks";

let lastFire = 0;

export function detectSwipe(ctx: DetectorContext) {
  const { primary, history, settings, now, emit } = ctx;
  if (!primary || !isOpenPalm(primary)) return;
  if (now - lastFire < settings.cooldownMs) return;

  const window = 220;
  const old = history.find((s) => now - s.t < window && s.primary);
  if (!old || !old.primary) return;

  const a = palmCenter(old.primary);
  const b = palmCenter(primary);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dt = Math.max((now - old.t) / 1000, 0.05);
  const vx = dx / dt;
  const vy = dy / dt;

  if (Math.abs(vx) < settings.swipeSpeed) return;
  if (Math.abs(vy) > Math.abs(vx) * 0.6) return; // reject diagonal

  const name = vx > 0 ? "swipe-right" : "swipe-left";
  const conf = Math.min(1, Math.abs(vx) / (settings.swipeSpeed * 2));
  if (conf < settings.confidenceFloor) return;

  lastFire = now;
  const evt: Omit<GestureEvent, "t"> = {
    name,
    phase: "active",
    confidence: conf,
    hand: primary.handedness,
    data: { vx, vy },
  };
  emit(evt);
}
