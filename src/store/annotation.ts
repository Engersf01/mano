"use client";
import { create } from "zustand";

export type Stroke = {
  id: string;
  slideId: string;
  tool: "pen" | "marker" | "highlight";
  color: string;
  thickness: number;
  opacity: number;
  points: { x: number; y: number; p?: number }[];
};

export type StickyNote = {
  id: string;
  slideId: string | null;
  x: number;
  y: number;
  z?: number;
  width: number;
  height: number;
  text: string;
  color: string;
  collapsed: boolean;
};

export type Shape = {
  id: string;
  slideId: string;
  kind: "rect" | "circle" | "line" | "arrow";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  thickness: number;
};

type Layer = {
  strokes: Stroke[];
  shapes: Shape[];
  stickies: StickyNote[];
};

type State = {
  layers: Record<string, Layer>;
  current: { strokes: Stroke[]; redo: Stroke[] };
};

type Actions = {
  beginStroke: (s: Omit<Stroke, "points" | "id">) => string;
  appendPoint: (id: string, p: { x: number; y: number; p?: number }) => void;
  commitStroke: (id: string) => void;
  undo: (slideId: string) => void;
  redo: (slideId: string) => void;
  addSticky: (n: Omit<StickyNote, "id">) => string;
  updateSticky: (id: string, patch: Partial<StickyNote>) => void;
  removeSticky: (id: string) => void;
  addShape: (s: Omit<Shape, "id">) => string;
  removeShape: (id: string) => void;
  clearSlide: (slideId: string) => void;
};

const emptyLayer = (): Layer => ({ strokes: [], shapes: [], stickies: [] });
const uid = () => Math.random().toString(36).slice(2, 10);

export const useAnnotationStore = create<State & Actions>()((set, get) => ({
  layers: {},
  current: { strokes: [], redo: [] },
  beginStroke: (s) => {
    const id = uid();
    const stroke: Stroke = { ...s, id, points: [] };
    set((st) => ({
      layers: {
        ...st.layers,
        [s.slideId]: {
          ...(st.layers[s.slideId] ?? emptyLayer()),
          strokes: [...(st.layers[s.slideId]?.strokes ?? []), stroke],
        },
      },
    }));
    return id;
  },
  appendPoint: (id, p) =>
    set((st) => {
      const layers = { ...st.layers };
      for (const slideId of Object.keys(layers)) {
        const layer = layers[slideId];
        const idx = layer.strokes.findIndex((s) => s.id === id);
        if (idx >= 0) {
          const stroke = { ...layer.strokes[idx], points: [...layer.strokes[idx].points, p] };
          const next = [...layer.strokes];
          next[idx] = stroke;
          layers[slideId] = { ...layer, strokes: next };
        }
      }
      return { layers };
    }),
  commitStroke: () => set((s) => ({ current: { ...s.current, redo: [] } })),
  undo: (slideId) =>
    set((st) => {
      const layer = st.layers[slideId];
      if (!layer || !layer.strokes.length) return st;
      const last = layer.strokes[layer.strokes.length - 1];
      return {
        layers: {
          ...st.layers,
          [slideId]: { ...layer, strokes: layer.strokes.slice(0, -1) },
        },
        current: { ...st.current, redo: [...st.current.redo, last] },
      };
    }),
  redo: (slideId) =>
    set((st) => {
      const r = st.current.redo;
      if (!r.length) return st;
      const last = r[r.length - 1];
      if (last.slideId !== slideId) return st;
      const layer = st.layers[slideId] ?? emptyLayer();
      return {
        layers: {
          ...st.layers,
          [slideId]: { ...layer, strokes: [...layer.strokes, last] },
        },
        current: { ...st.current, redo: r.slice(0, -1) },
      };
    }),
  addSticky: (n) => {
    const id = uid();
    const note: StickyNote = { ...n, id };
    const slideId = n.slideId ?? "_global";
    set((st) => ({
      layers: {
        ...st.layers,
        [slideId]: {
          ...(st.layers[slideId] ?? emptyLayer()),
          stickies: [...(st.layers[slideId]?.stickies ?? []), note],
        },
      },
    }));
    return id;
  },
  updateSticky: (id, patch) =>
    set((st) => {
      const layers = { ...st.layers };
      for (const slideId of Object.keys(layers)) {
        const layer = layers[slideId];
        const idx = layer.stickies.findIndex((n) => n.id === id);
        if (idx >= 0) {
          const next = [...layer.stickies];
          next[idx] = { ...next[idx], ...patch };
          layers[slideId] = { ...layer, stickies: next };
        }
      }
      return { layers };
    }),
  removeSticky: (id) =>
    set((st) => {
      const layers = { ...st.layers };
      for (const slideId of Object.keys(layers)) {
        const layer = layers[slideId];
        layers[slideId] = {
          ...layer,
          stickies: layer.stickies.filter((n) => n.id !== id),
        };
      }
      return { layers };
    }),
  addShape: (s) => {
    const id = uid();
    set((st) => ({
      layers: {
        ...st.layers,
        [s.slideId]: {
          ...(st.layers[s.slideId] ?? emptyLayer()),
          shapes: [...(st.layers[s.slideId]?.shapes ?? []), { ...s, id }],
        },
      },
    }));
    return id;
  },
  removeShape: (id) =>
    set((st) => {
      const layers = { ...st.layers };
      for (const slideId of Object.keys(layers)) {
        const layer = layers[slideId];
        layers[slideId] = {
          ...layer,
          shapes: layer.shapes.filter((s) => s.id !== id),
        };
      }
      return { layers };
    }),
  clearSlide: (slideId) =>
    set((st) => ({
      layers: { ...st.layers, [slideId]: emptyLayer() },
    })),
}));
