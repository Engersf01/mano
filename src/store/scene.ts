"use client";
import { create } from "zustand";

export type SceneMode =
  | "classic"
  | "spatial"
  | "brain"
  | "globe"
  | "timeline"
  | "zoom";

type State = {
  mode: SceneMode;
  cameraTargetId: string | null;
  focusedSlide: string | null;
  zoomDepth: number;
  envIntensity: number;
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
  mode: "spatial",
  cameraTargetId: null,
  focusedSlide: null,
  zoomDepth: 1,
  envIntensity: 0.85,
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
