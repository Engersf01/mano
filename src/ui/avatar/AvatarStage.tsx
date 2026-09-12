"use client";
/**
 * The avatar video surface. Used full-bleed on the panel and as a preview tile
 * in the console, so it carries no layout assumptions of its own — it fills
 * whatever box it's given.
 */
import { cn } from "@/lib/utils";
import type { DisplaySettings, DisplayStatus } from "@/heygen/protocol";

type Props = {
  videoRef: (element: HTMLVideoElement | null) => void;
  settings: DisplaySettings;
  status: DisplayStatus;
  speaking: boolean;
  caption?: string | null;
  /** Shown over the stage while there's no session. */
  standby?: React.ReactNode;
  className?: string;
};

const STATUS_COPY: Record<DisplayStatus, string> = {
  offline: "Display offline",
  gated: "Waiting for activation",
  idle: "Standing by",
  starting: "Connecting to HeyGen…",
  live: "Live",
  stopping: "Ending session…",
  error: "Session error",
};

export function AvatarStage({
  videoRef,
  settings,
  status,
  speaking,
  caption,
  standby,
  className,
}: Props) {
  const showVideo = status === "live" || status === "starting";

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{ background: settings.background }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        /**
         * The avatar's own audio comes through this element, so it must not be
         * muted — which is why the panel needs a tap before the first play.
         */
        className={cn(
          "h-full w-full transition-opacity duration-700",
          settings.fit === "cover" ? "object-cover" : "object-contain",
          showVideo ? "opacity-100" : "opacity-0",
        )}
        style={{
          transform: `${settings.mirror ? "scaleX(-1) " : ""}scale(${settings.scale})`,
        }}
      />

      {/* A soft rim that pulses while the avatar talks — readable from across a room. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-500",
          speaking ? "opacity-100" : "opacity-0",
        )}
        style={{ boxShadow: "inset 0 0 120px -20px rgba(96, 245, 255, 0.55)" }}
      />

      {!showVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          {standby ?? (
            <span className="text-xs uppercase tracking-[0.3em] text-ink-300">
              {STATUS_COPY[status]}
            </span>
          )}
        </div>
      )}

      {settings.showCaptions && caption && showVideo && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-6">
          <p className="max-w-3xl rounded-2xl bg-black/55 px-5 py-3 text-center text-lg leading-snug text-white backdrop-blur">
            {caption}
          </p>
        </div>
      )}
    </div>
  );
}

export { STATUS_COPY };
