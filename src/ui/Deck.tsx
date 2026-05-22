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

export default function Deck() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const index = useDeck((s) => s.index);
  const count = useDeck((s) => s.count);
  const scrimOpacity = useDeck((s) => s.scrimOpacity);

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

      {/* Top-right: live debug + camera */}
      <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-3">
        <CameraTile videoRef={videoRef} />
        <DebugHUD />
      </div>

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
