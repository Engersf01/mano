import { create } from "zustand";
import { slides } from "@/data/slides";
import type { SwipeDirection } from "@/gestures/swipe";

export type Flash = { dir: SwipeDirection; id: number } | null;

type DeckState = {
  index: number;
  count: number;
  flash: Flash;
  navigate: (dir: SwipeDirection) => void;
};

export const useDeck = create<DeckState>((set) => ({
  index: 0,
  count: slides.length,
  flash: null,
  navigate: (dir) =>
    set((s) => {
      const next =
        dir === "next"
          ? Math.min(s.index + 1, s.count - 1)
          : Math.max(s.index - 1, 0);
      // Always bump the flash id, even at a deck edge, so the user gets
      // immediate confirmation that the gesture registered.
      return {
        index: next,
        flash: { dir, id: (s.flash?.id ?? 0) + 1 },
      };
    }),
}));
