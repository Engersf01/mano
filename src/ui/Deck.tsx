"use client";

import { useCallback, useEffect, useRef } from "react";
import { slides } from "@/data/slides";
import { useDeck } from "@/store/deck";
import { useGestureRecognition } from "@/perception/useGestureRecognition";
import type { SwipeDirection } from "@/gestures/swipe";
import { Slide } from "./Slide";
import { CameraTile } from "./CameraTile";
import { DebugHUD } from "./DebugHUD";
import { ConfirmFlash } from "./ConfirmFlash";
import { DrawingOverlay } from "./DrawingOverlay";
import { DrawingToolbar } from "./DrawingToolbar";
import { PresenterStage } from "./PresenterStage";

export default function Deck() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const index = useDeck((s) => s.index);
  const count = useDeck((s) => s.count);
  const scrimOpacity = useDeck((s) => s.scrimOpacity);
  const stageMode = useDeck((s) => s.stageMode);

  // Stable across renders so the recognition effect never tears down.
  const onSwipe = useCallback((dir: SwipeDirection) => {
    useDeck.getState().navigate(dir);
  }, []);

  useGestureRecognition({ videoRef, onSwipe });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack keys while typing in a sticky note.
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable)
      )
        return;
      if (e.key === "ArrowRight" || e.key === " ")
        useDeck.getState().navigate("next");
      else if (e.key === "ArrowLeft") useDeck.getState().navigate("prev");
      else if (e.key === "s" || e.key === "S") useDeck.getState().toggleStage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-ink-950">
      {/* Slide carousel */}
      <div
        className="flex h-full w-full transition-transform duration-200 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <Slide key={i} slide={slide} />
        ))}
      </div>

      {/* Backdrop dimmer — fades the slide so ink reads on top of it */}
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-ink-950"
        style={{ opacity: scrimOpacity }}
      />

      <PresenterStage videoRef={videoRef} />

      <DrawingOverlay />

      <ConfirmFlash />

      {/* Progress dots */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/30"
            }`}
          />
        ))}
      </div>

      {/* Top-right: live debug + camera (camera hidden while you're on stage) */}
      <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-3">
        <CameraTile videoRef={videoRef} hidden={stageMode} />
        <DebugHUD />
      </div>

      {/* Top-left: stage toggle */}
      <button
        onClick={() => useDeck.getState().toggleStage()}
        className={`absolute left-4 top-4 z-30 rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
          stageMode
            ? "border-aurora-cyan/60 bg-aurora-cyan/20 text-white"
            : "border-white/15 bg-black/40 text-white/70 hover:bg-black/60 hover:text-white"
        }`}
      >
        {stageMode ? "◉ On stage" : "◎ Stage"}
      </button>

      <DrawingToolbar />

      {/* Bottom-left: cheat strip */}
      <div className="absolute bottom-5 left-5 z-20 max-w-xs font-mono text-xs text-white/40">
        Open palm + swipe ← / → · or use arrow keys ·{" "}
        <span className="text-white/60">
          {index + 1}/{count}
        </span>
      </div>
    </main>
  );
}
