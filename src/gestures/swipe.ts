import type { GestureSample } from "@/perception/types";

// Open-palm swipe detection.
//
// We do NOT hand-roll the pose — MediaPipe's pre-trained recognizer tells us
// when the hand is an open palm. We only watch how that palm travels
// horizontally and fire a single discrete event when it crosses a distance
// threshold quickly enough. Everything is tunable from this one block.

const PALM = "Open_Palm";
const SCORE_FLOOR = 0.5; // ignore low-confidence palm classifications
const WINDOW_MS = 320; // look-back window for a swipe
const MIN_DISTANCE = 0.22; // fraction of frame width the palm must travel
const MIN_SPEED = 0.8; // normalized units per second
const COOLDOWN_MS = 650; // suppress repeats after a fire

export type SwipeDirection = "next" | "prev";

type Point = { x: number; t: number };

export type SwipeDetector = {
  push: (sample: GestureSample) => SwipeDirection | null;
  reset: () => void;
};

export function createSwipeDetector(): SwipeDetector {
  let buffer: Point[] = [];
  let lastFire = 0;

  const reset = () => {
    buffer = [];
  };

  const push = (sample: GestureSample): SwipeDirection | null => {
    // Only an open palm with enough confidence is a candidate. Anything else
    // resets the trail so a swipe must be one continuous open-palm motion.
    if (sample.gesture !== PALM || sample.score < SCORE_FLOOR) {
      reset();
      return null;
    }

    // Mirror raw image x into screen space: the preview is selfie-mirrored, so
    // moving the hand toward the user's right increases mirrored x.
    const x = 1 - sample.wristX;
    const t = sample.timestamp;

    buffer.push({ x, t });
    while (buffer.length && t - buffer[0].t > WINDOW_MS) buffer.shift();
    if (buffer.length < 2) return null;

    if (t - lastFire < COOLDOWN_MS) return null;

    const first = buffer[0];
    const dx = x - first.x;
    const dt = (t - first.t) / 1000;
    if (dt <= 0) return null;

    const speed = Math.abs(dx) / dt;
    if (Math.abs(dx) < MIN_DISTANCE || speed < MIN_SPEED) return null;

    lastFire = t;
    reset();
    return dx > 0 ? "next" : "prev";
  };

  return { push, reset };
}
