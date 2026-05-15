"use client";
import { create } from "zustand";

export type SlideMedia = {
  kind: "image" | "video" | "youtube" | "iframe" | "model";
  src: string;
  caption?: string;
};

export type SlideKind = "title" | "content" | "quote" | "stat" | "media" | "split" | "chart";

export type Slide = {
  id: string;
  kind: SlideKind;
  title?: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  quote?: string;
  attribution?: string;
  stat?: { value: string; label: string };
  media?: SlideMedia;
  notes?: string;
  accent?: "cyan" | "violet" | "pink" | "gold";
  position?: [number, number, number];
  rotation?: [number, number, number];
  tags?: string[];
  timestamp?: string;
  location?: { lat: number; lng: number; place: string };
};

export type Deck = {
  id: string;
  title: string;
  author: string;
  slides: Slide[];
};

type State = {
  deck: Deck | null;
  index: number;
  history: number[];
};

type Actions = {
  load: (d: Deck) => void;
  next: () => void;
  prev: () => void;
  goto: (i: number) => void;
};

export const useDeckStore = create<State & Actions>()((set, get) => ({
  deck: null,
  index: 0,
  history: [0],
  load: (d) => set({ deck: d, index: 0, history: [0] }),
  next: () =>
    set((s) => {
      if (!s.deck) return s;
      const i = Math.min(s.index + 1, s.deck.slides.length - 1);
      return { index: i, history: [...s.history, i].slice(-20) };
    }),
  prev: () =>
    set((s) => {
      if (!s.deck) return s;
      const i = Math.max(s.index - 1, 0);
      return { index: i, history: [...s.history, i].slice(-20) };
    }),
  goto: (i) =>
    set((s) => {
      if (!s.deck) return s;
      const clamped = Math.max(0, Math.min(i, s.deck.slides.length - 1));
      return { index: clamped, history: [...s.history, clamped].slice(-20) };
    }),
}));
