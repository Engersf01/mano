"use client";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { HandFrame } from "@/perception/types";
import {
  DEFAULT_SETTINGS,
  type GestureEvent,
  type GestureListener,
  type GestureSettings,
} from "@/gestures/types";

type State = {
  ready: boolean;
  fps: number;
  error: string | null;
  frame: HandFrame | null;
  lastEvent: GestureEvent | null;
  pointer: { x: number; y: number; active: boolean; confidence: number };
  settings: GestureSettings;
  listeners: Set<GestureListener>;
};

type Actions = {
  setReady: (v: boolean) => void;
  setError: (m: string | null) => void;
  setHands: (f: HandFrame) => void;
  setFps: (n: number) => void;
  dispatch: (e: GestureEvent) => void;
  on: (l: GestureListener) => () => void;
  setSettings: (s: Partial<GestureSettings>) => void;
};

export const useGestureStore = create<State & Actions>()(
  subscribeWithSelector((set, get) => ({
    ready: false,
    fps: 0,
    error: null,
    frame: null,
    lastEvent: null,
    pointer: { x: 0.5, y: 0.5, active: false, confidence: 0 },
    settings: DEFAULT_SETTINGS,
    listeners: new Set(),
    setReady: (v) => set({ ready: v }),
    setError: (m) => set({ error: m }),
    setFps: (fps) => set({ fps }),
    setHands: (f) => set({ frame: f }),
    setSettings: (s) =>
      set((st) => ({ settings: { ...st.settings, ...s } })),
    dispatch: (e) => {
      set({ lastEvent: e });
      if (e.name === "point" && e.data) {
        set({
          pointer: {
            x: e.data.x,
            y: e.data.y,
            active: true,
            confidence: e.confidence,
          },
        });
      }
      const ls = get().listeners;
      ls.forEach((l) => l(e));
    },
    on: (l) => {
      get().listeners.add(l);
      return () => {
        get().listeners.delete(l);
      };
    },
  })),
);
