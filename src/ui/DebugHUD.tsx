import { useLiveStatsSnapshot } from "./useLiveStatsSnapshot";

export function DebugHUD() {
  const { gesture, score, fps, status } = useLiveStatsSnapshot();
  const live = status === "ready";

  return (
    <div className="pointer-events-none select-none rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-xs leading-5 text-white/80 backdrop-blur">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            live ? "bg-emerald-400" : "bg-amber-400"
          }`}
        />
        <span className="text-white/50">status</span>
        <span>{status}</span>
      </div>
      <div>
        <span className="text-white/50">gesture </span>
        <span className="text-aurora-cyan">{gesture}</span>
      </div>
      <div>
        <span className="text-white/50">conf </span>
        {(score * 100).toFixed(0)}%
      </div>
      <div>
        <span className="text-white/50">fps </span>
        {fps.toFixed(0)}
      </div>
    </div>
  );
}
