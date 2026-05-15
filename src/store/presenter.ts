"use client";
import { create } from "zustand";

type State = {
  isPresenting: boolean;
  startedAt: number | null;
  durationGoalMs: number;
  showNotes: boolean;
  showMinimap: boolean;
  audienceWindowOpen: boolean;
  teleprompter: boolean;
  cameraDeviceId: string | null;
  micDeviceId: string | null;
  permissions: { camera: "unknown" | "granted" | "denied"; mic: "unknown" | "granted" | "denied" };
};

type Actions = {
  start: () => void;
  stop: () => void;
  toggleNotes: () => void;
  toggleMinimap: () => void;
  toggleTeleprompter: () => void;
  setDevices: (cam: string | null, mic: string | null) => void;
  setPermission: (k: "camera" | "mic", v: "granted" | "denied") => void;
  setAudienceWindowOpen: (v: boolean) => void;
  setDurationGoal: (ms: number) => void;
};

export const usePresenterStore = create<State & Actions>()((set) => ({
  isPresenting: false,
  startedAt: null,
  durationGoalMs: 20 * 60 * 1000,
  showNotes: true,
  showMinimap: true,
  audienceWindowOpen: false,
  teleprompter: false,
  cameraDeviceId: null,
  micDeviceId: null,
  permissions: { camera: "unknown", mic: "unknown" },
  start: () => set({ isPresenting: true, startedAt: Date.now() }),
  stop: () => set({ isPresenting: false, startedAt: null }),
  toggleNotes: () => set((s) => ({ showNotes: !s.showNotes })),
  toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),
  toggleTeleprompter: () => set((s) => ({ teleprompter: !s.teleprompter })),
  setDevices: (cameraDeviceId, micDeviceId) => set({ cameraDeviceId, micDeviceId }),
  setPermission: (k, v) =>
    set((s) => ({ permissions: { ...s.permissions, [k]: v } })),
  setAudienceWindowOpen: (v) => set({ audienceWindowOpen: v }),
  setDurationGoal: (ms) => set({ durationGoalMs: ms }),
}));
