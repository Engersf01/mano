import type { DetectorContext } from "../types";
import { fingerStates } from "../landmarks";
import { pickerState, resetPicker } from "../pickerState";

// Left hand raised showing N fingers PREVIEWS view N; holding it steady for
// DWELL_MS CONFIRMS and locks that view. While the left hand is down, the
// picker is asleep and never interferes with right-hand presenting.
let held: { count: number; since: number } | null = null;
let lastFired = 0;
const DWELL_MS = 1000;
const COOLDOWN_MS = 700;

export function detectFingerCount(ctx: DetectorContext) {
  const hand = ctx.leftHand;
  if (!hand) {
    held = null;
    resetPicker();
    return;
  }

  const s = fingerStates(hand);
  const count = [s.index, s.middle, s.ring, s.pinky].filter(Boolean).length;

  if (count < 1 || count > 4) {
    held = null;
    resetPicker();
    return;
  }

  pickerState.visible = true;
  pickerState.count = count;

  if (!held || held.count !== count) {
    held = { count, since: ctx.now };
    pickerState.progress = 0;
    return;
  }

  const heldFor = ctx.now - held.since;
  const progress = Math.min(1, heldFor / DWELL_MS);
  pickerState.progress = progress;

  if (progress >= 1 && ctx.now - lastFired > COOLDOWN_MS) {
    lastFired = ctx.now;
    pickerState.justConfirmed = ctx.now;
    pickerState.progress = 0;
    held = { count, since: Number.MAX_SAFE_INTEGER }; // block immediate refire
    ctx.emit({
      name: "mode-select",
      phase: "active",
      confidence: 0.95,
      hand: "Left",
      data: { count },
    });
  }
}
