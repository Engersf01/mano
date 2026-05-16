"use client";
import { useEffect } from "react";
import { useGestureStore } from "@/store/gesture";
import { useDeckStore } from "@/store/deck";
import { useSceneStore } from "@/store/scene";
import { useToolsStore } from "@/store/tools";
import { useAnnotationStore } from "@/store/annotation";
import type { GestureEvent } from "./types";

export function useGestureIntents() {
  useEffect(() => {
    const off = useGestureStore.getState().on(handleEvent);
    return off;
  }, []);
}

function handleEvent(e: GestureEvent) {
  const deck = useDeckStore.getState();
  const scene = useSceneStore.getState();
  const tools = useToolsStore.getState();
  const ann = useAnnotationStore.getState();

  // Swipes always dismiss the radial first, then navigate. This way an
  // accidentally-opened menu doesn't block the deck.
  if ((e.name === "swipe-right" || e.name === "swipe-left") && tools.showRadial) {
    tools.setRadial(false);
  }

  switch (e.name) {
    case "swipe-right":
      deck.next();
      break;
    case "swipe-left":
      deck.prev();
      break;
    case "double-pinch": {
      const slide = deck.deck?.slides[deck.index];
      if (slide) scene.focusSlide(scene.focusedSlide === slide.id ? null : slide.id);
      break;
    }
    case "two-hand-zoom":
      if (e.phase === "active" && e.data?.scale)
        scene.setZoomDepth(e.data.scale);
      break;
    case "air-tap":
    case "release":
      if (tools.active === "sticky" && e.data) {
        const slide = deck.deck?.slides[deck.index];
        ann.addSticky({
          slideId: slide?.id ?? null,
          x: e.data.x,
          y: e.data.y,
          width: 0.18,
          height: 0.14,
          text: "",
          color: "#ffd28a",
          collapsed: false,
        });
      }
      break;
    case "circle":
      tools.setRadial(true);
      break;
    case "flick-down":
      tools.toggleToolbox();
      break;
    // Note: 'open-palm' is intentionally not mapped to anything. A resting
    // open hand fires it every 2s and would constantly re-trigger whatever
    // it's bound to. Use the circle gesture or the dock button instead.
  }
}
