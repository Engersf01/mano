"use client";
import { useEffect } from "react";
import { useGestureStore } from "@/store/gesture";
import { useDeckStore } from "@/store/deck";
import { useSceneStore, MODE_BY_FINGER } from "@/store/scene";
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
    // RIGHT HAND — navigation
    case "swipe-right":
      deck.next();
      break;
    case "swipe-left":
      deck.prev();
      break;

    // LEFT HAND — pick the visual mode by finger count
    case "mode-select": {
      const count = e.data?.count ?? 0;
      const mode = MODE_BY_FINGER[count];
      if (mode) scene.setMode(mode);
      break;
    }

    // BOTH HANDS — zoom
    case "two-hand-zoom":
      if (e.phase === "active" && e.data?.scale) scene.setZoomDepth(e.data.scale);
      break;

    // RIGHT HAND — drop a sticky (fist→open or quick pinch) when sticky tool active
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
  }
}
