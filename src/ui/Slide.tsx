import type { Slide as SlideData } from "@/data/slides";

export function Slide({ slide }: { slide: SlideData }) {
  return (
    <div className="flex h-full w-full shrink-0 items-center justify-center px-8">
      <div className="max-w-3xl">
        <p
          className="mb-4 font-mono text-sm uppercase tracking-[0.3em]"
          style={{ color: slide.accent }}
        >
          {slide.kicker}
        </p>
        <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">
          {slide.title}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-white/70 sm:text-xl">
          {slide.body}
        </p>
      </div>
    </div>
  );
}
