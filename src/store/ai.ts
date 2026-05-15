"use client";
import { create } from "zustand";

export type Caption = {
  id: string;
  t: number;
  text: string;
  final: boolean;
};

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  t: number;
};

type State = {
  open: boolean;
  captions: Caption[];
  captionLanguage: string;
  translation: string | null;
  messages: AssistantMessage[];
  thinking: boolean;
  voiceListening: boolean;
  coach: {
    pace: number;
    fillerWords: number;
    sentiment: "calm" | "engaged" | "rushed";
  };
};

type Actions = {
  toggle: () => void;
  pushCaption: (c: Caption) => void;
  setTranslation: (lang: string | null) => void;
  setLanguage: (lang: string) => void;
  pushMessage: (m: AssistantMessage) => void;
  setThinking: (v: boolean) => void;
  setVoiceListening: (v: boolean) => void;
  setCoach: (c: Partial<State["coach"]>) => void;
};

export const useAIStore = create<State & Actions>()((set) => ({
  open: false,
  captions: [],
  captionLanguage: "en-US",
  translation: null,
  messages: [],
  thinking: false,
  voiceListening: false,
  coach: { pace: 0, fillerWords: 0, sentiment: "calm" },
  toggle: () => set((s) => ({ open: !s.open })),
  pushCaption: (c) =>
    set((s) => ({ captions: [...s.captions.slice(-30), c] })),
  setTranslation: (translation) => set({ translation }),
  setLanguage: (captionLanguage) => set({ captionLanguage }),
  pushMessage: (m) =>
    set((s) => ({ messages: [...s.messages.slice(-50), m] })),
  setThinking: (thinking) => set({ thinking }),
  setVoiceListening: (voiceListening) => set({ voiceListening }),
  setCoach: (c) => set((s) => ({ coach: { ...s.coach, ...c } })),
}));
