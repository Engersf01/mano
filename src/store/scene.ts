"use client";
import { create } from "zustand";

export type SceneMode = "classic" | "timeline" | "zoom" | "brain";

export const MODE_BY_FINGER: Record<number, SceneMode> = {
  1: "classic",
  2: "timeline",
  3: "zoom",
  4: "brain",
};

export const MODE_LABELS: Record<SceneMode, string> = {
  classic: "Classic",
  timeline: "Timeline",
  zoom: "Zoom",
  brain: "Brain",
};

type State = {
  mode: SceneMode;
  focusedSlide: string | null;
  zoomDepth: number;
  showHands: boolean;
  showHud: boolean;
};

type Actions = {
  setMode: (m: SceneMode) => void;
  focusSlide: (id: string | null) => void;
  zoom: (delta: number) => void;
  setZoomDepth: (z: number) => void;
  toggleHands: () => void;
  toggleHud: () => void;
};

export const useSceneStore = create<State & Actions>()((set) => ({
  mode: "classic",
  focusedSlide: null,
  zoomDepth: 1,
  showHands: true,
  showHud: true,
  setMode: (m) => set({ mode: m, focusedSlide: null }),
  focusSlide: (id) => set({ focusedSlide: id }),
  zoom: (delta) =>
    set((s) => ({ zoomDepth: Math.max(0.4, Math.min(4, s.zoomDepth + delta)) })),
  setZoomDepth: (z) => set({ zoomDepth: Math.max(0.4, Math.min(4, z)) }),
  toggleHands: () => set((s) => ({ showHands: !s.showHands })),
  toggleHud: () => set((s) => ({ showHud: !s.showHud })),
}));
