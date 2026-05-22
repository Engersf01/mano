import type { DetectorContext } from "../types";
import { palmCenter, pinchDistance, handSize } from "../landmarks";

let startDist: number | null = null;
let active = false;

const PINCH_RATIO = 0.4;

// Both hands pinched + move apart/together = zoom.
export function detectTwoHand(ctx: DetectorContext) {
  const { leftHand, rightHand, emit } = ctx;
  if (!leftHand || !rightHand) {
    if (active) {
      active = false;
      startDist = null;
    }
    return;
  }
  const pa = pinchDistance(leftHand) / (handSize(leftHand) || 1);
  const pb = pinchDistance(rightHand) / (handSize(rightHand) || 1);
  const bothPinched = pa < PINCH_RATIO && pb < PINCH_RATIO;

  const a = palmCenter(leftHand);
  const b = palmCenter(rightHand);
  const d = Math.hypot(a.x - b.x, a.y - b.y);

  if (bothPinched) {
    if (!active) {
      active = true;
      startDist = d;
      emit({ name: "two-hand-zoom", phase: "start", confidence: 0.9, data: { d } });
    } else {
      const scale = startDist ? d / startDist : 1;
      emit({
        name: "two-hand-zoom",
        phase: "active",
        confidence: 0.9,
        data: { scale, d },
      });
    }
  } else if (active) {
    active = false;
    startDist = null;
    emit({ name: "two-hand-zoom", phase: "end", confidence: 0.9 });
  }
}
