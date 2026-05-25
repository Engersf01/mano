// Per-frame perception telemetry lives here, OUTSIDE React, on purpose.
//
// The debug HUD updates at camera rate (~30fps). Pushing that through Zustand
// or setState every frame is exactly the high-frequency re-render footgun the
// v1 retrospective called out. Instead the hook writes into this mutable
// singleton and the HUD reads it from a requestAnimationFrame loop, calling
// setState only when a displayed (rounded) value actually changes.

export type LiveStats = {
  gesture: string;
  score: number;
  fps: number;
  status: "loading" | "ready" | "no-camera" | "error";
};

const stats: LiveStats = {
  gesture: "—",
  score: 0,
  fps: 0,
  status: "loading",
};

export function setLiveStats(patch: Partial<LiveStats>): void {
  Object.assign(stats, patch);
}

export function getLiveStats(): Readonly<LiveStats> {
  return stats;
}
