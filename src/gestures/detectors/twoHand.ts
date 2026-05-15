import type { DetectorContext } from "../types";
import { palmCenter, pinchDistance, handSize } from "../landmarks";

let startDist: number | null = null;
let startAngle: number | null = null;
let active = false;

const PINCH_RATIO = 0.36;

export function detectTwoHand(ctx: DetectorContext) {
  const { primary, secondary, emit } = ctx;
  if (!primary || !secondary) {
    if (active) {
      active = false;
      startDist = null;
      startAngle = null;
    }
    return;
  }
  const pa = pinchDistance(primary) / (handSize(primary) || 1);
  const pb = pinchDistance(secondary) / (handSize(secondary) || 1);
  const bothPinched = pa < PINCH_RATIO && pb < PINCH_RATIO;

  const a = palmCenter(primary);
  const b = palmCenter(secondary);
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  const ang = Math.atan2(b.y - a.y, b.x - a.x);

  if (bothPinched) {
    if (!active) {
      active = true;
      startDist = d;
      startAngle = ang;
      emit({
        name: "two-hand-zoom",
        phase: "start",
        confidence: 0.9,
        data: { d, angle: ang },
      });
    } else {
      const scale = startDist ? d / startDist : 1;
      const rot = startAngle !== null ? ang - startAngle : 0;
      emit({
        name: "two-hand-zoom",
        phase: "active",
        confidence: 0.9,
        data: { scale, d },
      });
      emit({
        name: "two-hand-rotate",
        phase: "active",
        confidence: 0.9,
        data: { angle: rot },
      });
    }
  } else if (active) {
    active = false;
    startDist = null;
    startAngle = null;
    emit({
      name: "two-hand-zoom",
      phase: "end",
      confidence: 0.9,
    });
  }
}
