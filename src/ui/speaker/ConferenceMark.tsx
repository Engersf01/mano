"use client";
/**
 * The conference lockup, top-left of every speaker-hub page.
 *
 * A plain `<img>` rather than `next/image`, because this needs to know when
 * the file is missing: a broken-image icon at the top of a page an audience
 * was just told to visit is worse than no logo at all, so a missing file falls
 * back to type instead.
 *
 * Drop the conference artwork at `public/brand/kn-speaker.png` and it appears
 * here with no code change.
 */
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export const CONFERENCE_LOGO_SRC = "/brand/kn-speaker.png";

export function ConferenceMark({ className }: { className?: string }) {
  const [artwork, setArtwork] = useState(true);

  /**
   * `onError` alone is not enough here.
   *
   * The hub is server-rendered, so the browser starts fetching this image from
   * the initial HTML — and on a missing file the error fires *before* React
   * hydrates and attaches a handler, leaving the alt text and a broken-image
   * icon on screen forever. A ref callback runs at attach time and can ask the
   * element what already happened: a finished load with no intrinsic width is
   * a load that failed.
   */
  const check = useCallback((element: HTMLImageElement | null) => {
    if (element?.complete && element.naturalWidth === 0) setArtwork(false);
  }, []);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {artwork ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={check}
          src={CONFERENCE_LOGO_SRC}
          alt="Conference logo"
          onError={() => setArtwork(false)}
          className="h-9 w-auto max-w-[180px] object-contain sm:h-11"
        />
      ) : (
        <span className="font-display text-lg font-medium tracking-tight text-white">
          K<span className="text-aurora-cyan">N</span>
          <span className="ml-2 text-[10px] uppercase tracking-[0.3em] text-ink-300">
            Speaker
          </span>
        </span>
      )}
    </div>
  );
}
