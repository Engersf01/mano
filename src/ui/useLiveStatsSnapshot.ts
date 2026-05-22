import { useEffect, useState } from "react";
import { getLiveStats, type LiveStats } from "@/perception/liveStats";

// Reads the per-frame perception singleton from a rAF loop and only triggers a
// React re-render when a *displayed* value changes (gesture, status, rounded
// score, rounded fps). Keeps ~30fps telemetry from flooding React.
export function useLiveStatsSnapshot(): LiveStats {
  const [snap, setSnap] = useState<LiveStats>(() => ({ ...getLiveStats() }));

  useEffect(() => {
    let raf = 0;
    let prevKey = "";
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const s = getLiveStats();
      const key = `${s.status}|${s.gesture}|${Math.round(
        s.score * 100,
      )}|${Math.round(s.fps)}`;
      if (key !== prevKey) {
        prevKey = key;
        setSnap({ ...s });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return snap;
}
