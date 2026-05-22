import { useDeck } from "@/store/deck";

// Fires the instant a swipe is recognized — keyed by flash.id so the animation
// replays on every gesture, even repeats. This is the latency mask: the user
// sees confirmation before the slide finishes sliding.
export function ConfirmFlash() {
  const flash = useDeck((s) => s.flash);
  if (!flash) return null;

  const isNext = flash.dir === "next";
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div
        key={flash.id}
        className="flex animate-flashIn items-center gap-3 rounded-2xl border border-white/15 bg-black/40 px-8 py-5 text-5xl font-bold backdrop-blur"
      >
        <span aria-hidden>{isNext ? "→" : "←"}</span>
        <span className="text-xl uppercase tracking-widest text-white/70">
          {isNext ? "Next" : "Prev"}
        </span>
      </div>
    </div>
  );
}
