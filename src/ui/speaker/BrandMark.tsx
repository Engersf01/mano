"use client";
/**
 * The NeumoMeet lockup, top-left of every speaker-hub page.
 *
 * A plain `<img>` rather than `next/image`, because this needs to know when
 * the artwork is missing: a broken-image icon at the top of a page an audience
 * was just told to visit is worse than no logo at all. So the wordmark below
 * is not a placeholder — it is the real lockup, drawn in type, and the raster
 * file supersedes it when present.
 *
 * Drop the supplied artwork at `public/brand/neumomeet.png` and it appears
 * here with no code change.
 */
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export const BRAND_LOGO_SRC = "/brand/neumomeet.png";

export function BrandMark({ className }: { className?: string }) {
  const [artwork, setArtwork] = useState(true);

  /**
   * `onError` alone is not enough here.
   *
   * The hub is server-rendered, so the browser starts fetching this image from
   * the initial HTML — and on a missing file the error fires *before* React
   * hydrates and attaches a handler, leaving the alt text and a broken-image
   * icon on screen for good. A ref callback runs at attach time and can ask
   * the element what already happened: a finished load with no intrinsic width
   * is a load that failed.
   */
  const check = useCallback((element: HTMLImageElement | null) => {
    if (element?.complete && element.naturalWidth === 0) setArtwork(false);
  }, []);

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {artwork ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={check}
          src={BRAND_LOGO_SRC}
          alt="NeumoMeet"
          onError={() => setArtwork(false)}
          className="h-8 w-auto max-w-[190px] object-contain sm:h-10"
        />
      ) : (
        <Wordmark />
      )}
    </div>
  );
}

/**
 * Type-only lockup: two overlapping rings for the "meet", then the name set in
 * two weights so the brand reads as one word rather than two.
 */
function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="relative block h-5 w-8 shrink-0">
        <span className="absolute left-0 top-0 h-5 w-5 rounded-full border-[2.5px] border-cyan-600" />
        <span className="absolute right-0 top-0 h-5 w-5 rounded-full border-[2.5px] border-violet-500/80" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
        Neumo<span className="text-cyan-700">Meet</span>
      </span>
    </span>
  );
}
