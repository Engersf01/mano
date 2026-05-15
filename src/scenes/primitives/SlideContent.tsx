"use client";
import type { Slide } from "@/store/deck";
import { accentToHex } from "@/lib/utils";

export function SlideContent({
  slide,
  width = 1.6,
}: {
  slide: Slide;
  width?: number;
}) {
  const accent = accentToHex(slide.accent);
  // Width controls font sizes via container queries-ish scaling
  const scale = width / 1.6;
  const px = (n: number) => `${n * scale}px`;

  if (slide.kind === "title") {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center px-12 text-center"
        style={{ color: "#f5f7fb" }}
      >
        <div
          className="mb-6 h-px w-24 origin-center"
          style={{ background: accent, boxShadow: `0 0 24px ${accent}` }}
        />
        <h1
          className="font-display tracking-tight"
          style={{ fontSize: px(72), lineHeight: 1.02, letterSpacing: "-0.02em" }}
        >
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p
            className="mt-6 text-ink-200"
            style={{ fontSize: px(24), maxWidth: "80%" }}
          >
            {slide.subtitle}
          </p>
        )}
      </div>
    );
  }

  if (slide.kind === "quote") {
    return (
      <div
        className="flex h-full w-full flex-col items-start justify-center gap-6 px-16"
        style={{ color: "#f5f7fb" }}
      >
        <div
          className="font-display italic"
          style={{ fontSize: px(48), lineHeight: 1.18, letterSpacing: "-0.01em" }}
        >
          <span style={{ color: accent }}>“</span>
          {slide.quote}
          <span style={{ color: accent }}>”</span>
        </div>
        {slide.attribution && (
          <div className="text-ink-300" style={{ fontSize: px(18) }}>
            {slide.attribution}
          </div>
        )}
      </div>
    );
  }

  if (slide.kind === "stat") {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-3 px-12 text-center"
        style={{ color: "#f5f7fb" }}
      >
        <div
          className="font-display"
          style={{
            fontSize: px(140),
            lineHeight: 1,
            color: accent,
            textShadow: `0 0 60px ${accent}55`,
            letterSpacing: "-0.04em",
          }}
        >
          {slide.stat?.value}
        </div>
        <div className="text-ink-200 uppercase tracking-[0.25em]" style={{ fontSize: px(16) }}>
          {slide.stat?.label}
        </div>
      </div>
    );
  }

  if (slide.kind === "content") {
    return (
      <div
        className="flex h-full w-full flex-col justify-center gap-6 px-14"
        style={{ color: "#f5f7fb" }}
      >
        <h2
          className="font-display"
          style={{ fontSize: px(44), lineHeight: 1.08, letterSpacing: "-0.02em" }}
        >
          <span style={{ color: accent }}>{slide.title?.slice(0, 1)}</span>
          {slide.title?.slice(1)}
        </h2>
        <ul className="flex flex-col gap-3">
          {slide.bullets?.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-ink-100"
              style={{ fontSize: px(22), lineHeight: 1.35 }}
            >
              <span
                className="mt-3 inline-block h-1 w-6 flex-shrink-0"
                style={{ background: accent }}
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (slide.kind === "split") {
    return (
      <div className="grid h-full w-full grid-cols-2 gap-10 p-14" style={{ color: "#f5f7fb" }}>
        <div className="flex flex-col justify-center gap-4">
          <h2
            className="font-display"
            style={{ fontSize: px(44), lineHeight: 1.08, letterSpacing: "-0.02em", color: accent }}
          >
            {slide.title}
          </h2>
          <p className="text-ink-200" style={{ fontSize: px(20), lineHeight: 1.45 }}>
            {slide.body}
          </p>
        </div>
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10"
          style={{
            background: `radial-gradient(120% 80% at 20% 0%, ${accent}30 0%, transparent 60%), linear-gradient(160deg, #0b0e1f 0%, #03040c 100%)`,
          }}
        >
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ color: "#f5f7fb", fontSize: px(28) }}
    >
      {slide.title ?? slide.body ?? slide.id}
    </div>
  );
}
