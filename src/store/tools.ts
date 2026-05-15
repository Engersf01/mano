"use client";
import { create } from "zustand";

export type ToolName =
  | "cursor"
  | "laser"
  | "pen"
  | "marker"
  | "highlight"
  | "shape"
  | "arrow"
  | "sticky"
  | "text"
  | "eraser";

type State = {
  active: ToolName;
  color: string;
  thickness: number;
  opacity: number;
  shape: "rect" | "circle" | "line" | "arrow";
  showToolbox: boolean;
  showRadial: boolean;
};

type Actions = {
  setActive: (t: ToolName) => void;
  setColor: (c: string) => void;
  setThickness: (n: number) => void;
  setOpacity: (n: number) => void;
  setShape: (s: State["shape"]) => void;
  toggleToolbox: () => void;
  setRadial: (v: boolean) => void;
};

export const useToolsStore = create<State & Actions>()((set) => ({
  active: "cursor",
  color: "#60f5ff",
  thickness: 6,
  opacity: 1,
  shape: "rect",
  showToolbox: true,
  showRadial: false,
  setActive: (t) => set({ active: t, showRadial: false }),
  setColor: (c) => set({ color: c }),
  setThickness: (n) => set({ thickness: n }),
  setOpacity: (n) => set({ opacity: n }),
  setShape: (s) => set({ shape: s }),
  toggleToolbox: () => set((s) => ({ showToolbox: !s.showToolbox })),
  setRadial: (v) => set({ showRadial: v }),
}));
