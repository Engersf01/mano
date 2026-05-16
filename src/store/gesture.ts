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

// Names whose 'active' phase fires every frame and would flood React state
// updates if forwarded to lastEvent on every emit.
const CONTINUOUS = new Set([
  "point",
  "pinch",
  "grab",
  "two-hand-zoom",
  "two-hand-rotate",
]);

let lastEventAt = 0;

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
      // Always forward to imperative listeners (intents, annotation drawing).
      // These run without React re-renders.
      const ls = get().listeners;
      ls.forEach((l) => l(e));

      // pointer updates feed the laser-cursor render; throttling them would
      // make the cursor stutter, so they bypass the lastEvent throttle.
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

      // Only push to lastEvent (a React-subscribed value) for discrete
      // gesture moments — and at most every 100ms — so we don't flood
      // React's per-tick update budget.
      const isContinuousActive =
        CONTINUOUS.has(e.name) && e.phase === "active";
      if (!isContinuousActive) {
        set({ lastEvent: e });
        lastEventAt = e.t;
        return;
      }
      if (e.t - lastEventAt > 100) {
        set({ lastEvent: e });
        lastEventAt = e.t;
      }
    },
    on: (l) => {
      get().listeners.add(l);
      return () => {
        get().listeners.delete(l);
      };
    },
  })),
);
