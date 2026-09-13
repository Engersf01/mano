"use client";
/**
 * The stand's branding, along the bottom of the panel.
 *
 * Deliberately quiet. On a holographic panel every lit pixel competes with the
 * avatar's face, so this sits low, dimmed, and never animates — it should read
 * as a plate under her rather than as a second thing to look at.
 *
 * The artwork is a file in `public/brand/`, and if it isn't there the lockup
 * falls back to type. That matters more than it sounds: the panel is the whole
 * product at a conference, and a missing image must not leave a broken-image
 * icon glowing on a black screen in front of a room of physicians.
 */
import { useState } from "react";

/** Drop the supplied artwork here and it is picked up with no code change. */
export const BRAND_LOGO_SRC = "/brand/nxt-natalie.png";

export function BrandMark({ className }: { className?: string }) {
  const [artwork, setArtwork] = useState(true);

  return (
    <div
      // Never intercept touch: the panel's long-press-to-reset lives on the
      // whole stage, and a visitor's finger lands low as often as anywhere.
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-[5] flex justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))] ${className ?? ""}`}
    >
      {artwork ? (
        // A plain <img>, not next/image: this needs an error handler to fall
        // back to type, which the optimized component doesn't surface.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={BRAND_LOGO_SRC}
          alt="nxT Innovation Lab — Natalie"
          onError={() => setArtwork(false)}
          className="h-auto max-h-[9vh] w-auto max-w-[68vw] object-contain opacity-70 drop-shadow-[0_0_18px_rgba(0,0,0,0.9)]"
        />
      ) : (
        <Wordmark />
      )}
    </div>
  );
}

/**
 * Type-only lockup, used until the artwork lands.
 *
 * `nxT` is set as the brand writes it — lowercase, capital T — which is exactly
 * why the avatar is told to *say* "Next": the eye reads the logo, the speech
 * engine reads her words, and only one of them should see "nxT".
 */
function Wordmark() {
  return (
    <div className="flex items-center gap-3 opacity-70">
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
