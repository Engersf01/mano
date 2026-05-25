import { create } from "zustand";
import { slides } from "@/data/slides";
import type { SwipeDirection } from "@/gestures/swipe";

export type Flash = { dir: SwipeDirection; id: number } | null;

export type Tool = "pen" | "eraser";

// Stroke points are stored in normalized 0..1 coordinates so they survive
// viewport resizes and DPR changes — the canvas multiplies by its own size.
export type Point = { x: number; y: number };

export type Stroke = {
  tool: Tool;
  color: string;
  width: number;
  points: Point[];
};

export type Note = {
  id: string;
  x: number; // normalized 0..1, top-left
  y: number;
  text: string;
};

type DeckState = {
  index: number;
  count: number;
  flash: Flash;
  navigate: (dir: SwipeDirection) => void;

  drawMode: boolean;
  stageMode: boolean; // composite the presenter into the slide
  tool: Tool;
  color: string;
  penWidth: number;
  scrimOpacity: number; // 0 = slide fully visible, 1 = slide fully dimmed
  strokesBySlide: Record<number, Stroke[]>;
  notesBySlide: Record<number, Note[]>;

  toggleDrawMode: () => void;
  toggleStage: () => void;
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setPenWidth: (width: number) => void;
  setScrimOpacity: (opacity: number) => void;
  addStroke: (slide: number, stroke: Stroke) => void;
  undoStroke: (slide: number) => void;
  clearSlide: (slide: number) => void;
  addNote: (slide: number) => void;
  updateNote: (slide: number, id: string, patch: Partial<Note>) => void;
  removeNote: (slide: number, id: string) => void;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

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

  drawMode: false,
  stageMode: false,
  tool: "pen",
  color: "#ffffff",
  penWidth: 4,
  scrimOpacity: 0,
  strokesBySlide: {},
  notesBySlide: {},

  toggleDrawMode: () => set((s) => ({ drawMode: !s.drawMode })),
  toggleStage: () => set((s) => ({ stageMode: !s.stageMode })),
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color, tool: "pen" }),
  setPenWidth: (penWidth) => set({ penWidth }),
  setScrimOpacity: (opacity) => set({ scrimOpacity: clamp01(opacity) }),

  addStroke: (slide, stroke) =>
    set((s) => ({
      strokesBySlide: {
        ...s.strokesBySlide,
        [slide]: [...(s.strokesBySlide[slide] ?? []), stroke],
      },
    })),

  undoStroke: (slide) =>
    set((s) => ({
      strokesBySlide: {
        ...s.strokesBySlide,
        [slide]: (s.strokesBySlide[slide] ?? []).slice(0, -1),
      },
    })),

  clearSlide: (slide) =>
    set((s) => ({
      strokesBySlide: { ...s.strokesBySlide, [slide]: [] },
    })),

  addNote: (slide) =>
    set((s) => {
      const existing = s.notesBySlide[slide] ?? [];
      const offset = (existing.length % 5) * 0.03;
      const note: Note = {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `n${Date.now()}${Math.random()}`,
        x: 0.4 + offset,
        y: 0.3 + offset,
        text: "",
      };
      return {
        notesBySlide: { ...s.notesBySlide, [slide]: [...existing, note] },
      };
    }),

  updateNote: (slide, id, patch) =>
    set((s) => ({
      notesBySlide: {
        ...s.notesBySlide,
        [slide]: (s.notesBySlide[slide] ?? []).map((n) =>
          n.id === id ? { ...n, ...patch } : n,
        ),
      },
    })),

  removeNote: (slide, id) =>
    set((s) => ({
      notesBySlide: {
        ...s.notesBySlide,
        [slide]: (s.notesBySlide[slide] ?? []).filter((n) => n.id !== id),
      },
    })),
}));
