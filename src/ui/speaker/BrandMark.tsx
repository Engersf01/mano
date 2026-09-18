"use client";
/**
 * The NeumoMeet lockup, in the two sizes this site needs.
 *
 * The supplied artwork is a *stacked* lockup — graphic, wordmark, year,
 * tagline, one above the other in a near-square. That shape cannot survive a
 * 40px-tall header slot: everything below the lungs collapses into an
 * illegible smudge. So there are two treatments, both cut from the same file:
 *
 *   `mark` — the lungs graphic alone (`neumomeet-mark.png`, cropped from the
 *            supplied art at its own natural break above the wordmark),
 *            paired with the name in type. Recognisable small; readable.
 *   `full` — the whole lockup, shown large enough that the wordmark, the year
 *            and the tagline are all actually readable.
 *
 * Plain `<img>` rather than `next/image` in both cases, because this needs to
 * know when the file is missing: a broken-image icon at the top of a page an
 * audience was just told to visit is worse than no logo at all.
 */
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export const BRAND_LOGO_SRC = "/brand/neumomeet.png";
export const BRAND_MARK_SRC = "/brand/neumomeet-mark.png";

/**
 * `onError` alone is not enough on a server-rendered page.
 *
 * The browser starts fetching from the initial HTML, so on a missing file the
 * error fires *before* React hydrates and attaches a handler, leaving the alt
 * text and a broken-image icon on screen for good. A ref callback runs at
 * attach time and can ask the element what already happened: a finished load
 * with no intrinsic width is a load that failed.
 */
function useArtwork() {
  const [ok, setOk] = useState(true);
  const check = useCallback((element: HTMLImageElement | null) => {
    if (element?.complete && element.naturalWidth === 0) setOk(false);
  }, []);
  return { ok, check, fail: () => setOk(false) };
}

/** The compact lockup: graphic plus the name in type. Headers, nav bars. */
export function BrandMark({ className }: { className?: string }) {
  const artwork = useArtwork();

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      {artwork.ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={artwork.check}
          src={BRAND_MARK_SRC}
          alt=""
          aria-hidden
          onError={artwork.fail}
          className="h-8 w-auto shrink-0 object-contain sm:h-9"
        />
      ) : (
        <Rings />
      )}
      <span className="font-display text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
        Neumo<span className="text-cyan-700">Meet</span>
      </span>
    </span>
  );
}

/**
 * The full lockup, for the top of a page.
 *
 * Sized from the tagline: below roughly 320px wide "Donde lo clínico y lo
 * quirúrgico se encuentran" stops being readable, which is the whole reason
 * this variant exists rather than scaling the header one up.
 */
export function BrandLockup({ className }: { className?: string }) {
  const artwork = useArtwork();

  if (!artwork.ok) {
    return (
      <span className={cn("flex items-center gap-3", className)}>
        <Rings />
        <span className="font-display text-2xl font-semibold tracking-tight text-slate-900">
          Neumo<span className="text-cyan-700">Meet</span>{" "}
          <span className="text-slate-400">2026</span>
        </span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={artwork.check}
      src={BRAND_LOGO_SRC}
      alt="NeumoMeet 2026 — Donde lo clínico y lo quirúrgico se encuentran"
      onError={artwork.fail}
      // Reserving the ratio stops a late load nudging the headline down the
      // page after someone has started reading it.
      width={1080}
      height={1080}
      className={cn("h-auto w-64 object-contain sm:w-80", className)}
    />
  );
}

/** Type-only stand-in, used only when the artwork is missing. */
function Rings() {
  return (
    <span aria-hidden className="relative block h-5 w-8 shrink-0">
      <span className="absolute left-0 top-0 h-5 w-5 rounded-full border-[2.5px] border-cyan-600" />
      <span className="absolute right-0 top-0 h-5 w-5 rounded-full border-[2.5px] border-violet-500/80" />
    </span>
  );
}
