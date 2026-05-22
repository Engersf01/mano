import type { DetectorContext } from "../types";
import { fingerStates } from "../landmarks";

// Left hand held up with N fingers selects one of the 4 visual modes.
// Must be held steady ~350ms to confirm, with a cooldown so it doesn't
// re-fire continuously while the hand stays up.
let held: { count: number; since: number } | null = null;
let lastFired = 0;
const HOLD_MS = 350;
const COOLDOWN_MS = 900;

export function detectFingerCount(ctx: DetectorContext) {
  const hand = ctx.leftHand;
  if (!hand) {
    held = null;
    return;
  }
  const s = fingerStates(hand);
  const count = [s.index, s.middle, s.ring, s.pinky].filter(Boolean).length;
  if (count < 1 || count > 4) {
    held = null;
    return;
  }

  if (!held || held.count !== count) {
    held = { count, since: ctx.now };
    return;
  }

  const heldFor = ctx.now - held.since;
  if (heldFor > HOLD_MS && ctx.now - lastFired > COOLDOWN_MS) {
    lastFired = ctx.now;
    ctx.emit({
      name: "mode-select",
      phase: "active",
      confidence: 0.92,
      hand: "Left",
      data: { count },
    });
  }
}
