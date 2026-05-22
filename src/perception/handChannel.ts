// Latest hand sample, published OUTSIDE React on purpose.
//
// Gesture drawing needs the fingertip every camera frame (~30fps). Routing that
// through Zustand/setState would re-render the canvas each frame — the exact
// high-frequency footgun the v1 retrospective warned about. Instead the
// recognition hook writes the latest sample here and the drawing overlay reads
// it from its own requestAnimationFrame loop.

import type { GestureSample } from "./types";

let latest: GestureSample | null = null;

export function setHandSample(sample: GestureSample): void {
  latest = sample;
}

export function getHandSample(): GestureSample | null {
  return latest;
}
