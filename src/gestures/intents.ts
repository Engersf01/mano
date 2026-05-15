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

  switch (e.name) {
    case "swipe-right":
      deck.next();
      break;
    case "swipe-left":
      deck.prev();
      break;
    case "open-palm":
      tools.setRadial(true);
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
  }
}
