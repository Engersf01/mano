"use client";
/**
 * The stand's lockup — the nxT badge and Natalie's name — sitting where a
 * broadcast lower-third sits: bottom left, lifted off the edge, so a viewer
 * knows who is talking without it reading as a caption or a watermark.
 *
 * Left rather than centred because centre puts it under her chin on a portrait
 * panel; lifted off the bottom because a panel's lowest band is the first thing
 * a bezel, a shelf edge or someone's head cuts off.
 *
 * The artwork is generated from the supplied logo by `scripts/brand-asset.py`
 * — the supplied file sets the name in near-black, which is invisible on the
 * black background the panel needs, so the script knocks the wordmark out to
 * white. If the file is missing the lockup falls back to type rather than
 * leaving a broken-image icon glowing on a black screen, which is the failure
 * that actually matters: the panel *is* the product at a conference.
 */
import { useState } from "react";

export const BRAND_LOGO_SRC = "/brand/nxt-natalie.png";

/** Trimmed artwork is 1400×802. Reserving the ratio stops a late load nudging
 *  the layout, and keeps the fallback the same size as the real thing. */
const ASPECT = "1400 / 802";

export function BrandMark({ className }: { className?: string }) {
  const [artwork, setArtwork] = useState(true);

  return (
    <div
      // Never intercept touch: the long-press-to-reset lives on the whole
      // stage, and a finger lands low-left as often as anywhere.
      className={`pointer-events-none absolute z-[5] bottom-[max(7vh,env(safe-area-inset-bottom))] left-[max(5vw,env(safe-area-inset-left))] ${className ?? ""}`}
      style={{ width: "min(52vw, 24rem)" }}
    >
      {artwork ? (
        // A plain <img>, not next/image: this needs an error handler to fall
        // back to type, which the optimized component doesn't surface.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={BRAND_LOGO_SRC}
          alt="nxT Innovation Lab — Natalie"
          onError={() => setArtwork(false)}
          style={{ aspectRatio: ASPECT }}
          className="block w-full object-contain opacity-[0.85] drop-shadow-[0_2px_20px_rgba(0,0,0,0.85)]"
        />
      ) : (
        <Wordmark />
      )}
    </div>
  );
}

/**
 * Type-only lockup, used only if the artwork is missing.
 *
 * `nxT` is set as the brand writes it — lowercase, capital T — which is exactly
 * why the avatar is told to *say* "Next": the eye reads the logo, the speech
 * engine reads her words, and only one of them should ever see "nxT".
 */
function Wordmark() {
  return (
    <div className="flex items-end gap-3 opacity-[0.85]" style={{ aspectRatio: ASPECT }}>
      <span className="font-display text-[clamp(1.1rem,3.2vw,1.9rem)] leading-none tracking-tight text-white">
        nx<span className="text-aurora-cyan">T</span>
      </span>
      <span className="h-[1.6em] w-px bg-white/25" />
      <span className="flex flex-col leading-tight">
        <span className="font-display text-[clamp(0.85rem,2.4vw,1.4rem)] tracking-tight text-white">
          Natalie
        </span>
        <span className="text-[clamp(0.5rem,1.2vw,0.65rem)] uppercase tracking-[0.28em] text-ink-300">
          Innovation Lab
        </span>
      </span>
    </div>
  );
}
