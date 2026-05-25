import { type RefObject } from "react";
import { useLiveStatsSnapshot } from "./useLiveStatsSnapshot";

const STATUS_LABEL: Record<string, string> = {
  loading: "Loading model…",
  ready: "",
  "no-camera": "Camera blocked — use arrow keys",
  error: "Recognizer error — use arrow keys",
};

export function CameraTile({
  videoRef,
  hidden = false,
}: {
  videoRef: RefObject<HTMLVideoElement>;
  hidden?: boolean;
}) {
  const { status } = useLiveStatsSnapshot();
  const overlay = STATUS_LABEL[status];

  // When hidden (e.g. stage mode) keep the <video> mounted and decoding by
  // parking it off-screen — both the gesture and segmentation pipelines read
  // frames from it, so it must never unmount.
  return (
    <div
      className={
        hidden
          ? "pointer-events-none fixed -left-[9999px] top-0 h-36 w-48 overflow-hidden opacity-0"
          : "relative h-36 w-48 overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-lg"
      }
    >
      <video
        ref={videoRef}
        muted
        playsInline
        // Selfie-mirror so the preview matches the user's mental model.
        className="h-full w-full -scale-x-100 object-cover"
      />
      {overlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-3 text-center text-xs text-white/80">
          {overlay}
        </div>
      )}
    </div>
  );
}
