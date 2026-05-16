import type { HandFrame, Hand, Landmark } from "@/perception/types";
import { Vec2OneEuro } from "./filters/oneEuro";
import {
  DEFAULT_SETTINGS,
  type DetectorContext,
  type GestureEvent,
  type HandSnapshot,
} from "./types";
import { useGestureStore } from "@/store/gesture";
import { detectSwipe } from "./detectors/swipe";
import { detectPinch } from "./detectors/pinch";
import { detectPointAndTap } from "./detectors/point";
import { detectGrab } from "./detectors/grab";
import { detectTwoHand } from "./detectors/twoHand";
import { detectOpenPalm } from "./detectors/openPalm";
import { detectCircle } from "./detectors/circle";

const HISTORY = 24;

export class GestureEngine {
  private history: HandSnapshot[] = [];
  private filtersByHand = new Map<string, Map<number, Vec2OneEuro>>();

  private smooth(h: Hand, t: number): Hand {
    let perHand = this.filtersByHand.get(h.handedness);
    if (!perHand) {
      perHand = new Map();
      this.filtersByHand.set(h.handedness, perHand);
    }
    const smoothed: Landmark[] = h.landmarks.map((p, i) => {
      let f = perHand!.get(i);
      if (!f) {
        // High beta = very responsive to motion (low lag), minCutoff stays
        // moderate to keep the resting cursor stable.
        f = new Vec2OneEuro(1.5, 0.4, 1.0);
        perHand!.set(i, f);
      }
      const xy = f.filter({ x: p.x, y: p.y }, t);
      return { x: xy.x, y: xy.y, z: p.z };
    });
    return { ...h, landmarks: smoothed };
  }

  tick(frame: HandFrame) {
    const settings = useGestureStore.getState().settings ?? DEFAULT_SETTINGS;
    if (!settings.enabled) return;

    const smoothed = frame.hands.map((h) => this.smooth(h, frame.t));
    let primary: Hand | null = null;
    let secondary: Hand | null = null;
    if (smoothed.length === 1) primary = smoothed[0];
    else if (smoothed.length >= 2) {
      const sorted = [...smoothed].sort((a, b) => b.score - a.score);
      primary = sorted[0];
      secondary = sorted[1];
    }

    const snap: HandSnapshot = {
      t: frame.t,
      frame: { ...frame, hands: smoothed },
      primary,
      secondary,
    };
    this.history.push(snap);
    if (this.history.length > HISTORY) this.history.shift();

    const emitted: GestureEvent[] = [];
    const emit = (e: Omit<GestureEvent, "t">) =>
      emitted.push({ ...e, t: frame.t });

    const ctx: DetectorContext = {
      frame: snap.frame,
      primary,
      secondary,
      history: this.history,
      emit,
      now: frame.t,
      settings,
    };

    detectSwipe(ctx);
    detectPinch(ctx);
    detectPointAndTap(ctx);
    detectGrab(ctx);
    detectTwoHand(ctx);
    detectOpenPalm(ctx);
    detectCircle(ctx);

    if (emitted.length) {
      const dispatch = useGestureStore.getState().dispatch;
      for (const e of emitted) dispatch(e);
    }
  }
}
