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
import { detectFingerCount } from "./detectors/fingerCount";
import { pickerState } from "./pickerState";

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
    let rightHand: Hand | null = null;
    let leftHand: Hand | null = null;
    for (const h of smoothed) {
      if (h.handedness === "Right" && (!rightHand || h.score > rightHand.score))
        rightHand = h;
      else if (h.handedness === "Left" && (!leftHand || h.score > leftHand.score))
        leftHand = h;
    }

    const snap: HandSnapshot = {
      t: frame.t,
      frame: { ...frame, hands: smoothed },
      rightHand,
      leftHand,
    };
    this.history.push(snap);
    if (this.history.length > HISTORY) this.history.shift();

    const emitted: GestureEvent[] = [];
    const emit = (e: Omit<GestureEvent, "t">) =>
      emitted.push({ ...e, t: frame.t });

    const ctx: DetectorContext = {
      frame: snap.frame,
      rightHand,
      leftHand,
      history: this.history,
      emit,
      now: frame.t,
      settings,
    };

    // Run the finger-count detector first so pickerState.visible reflects
    // whether the left hand is ACTIVELY showing 1-4 fingers this frame.
    detectFingerCount(ctx);

    // Two-phase model:
    //  - Picker NOT visible -> Presenting: right hand drives all actions.
    //    (A left hand merely resting in frame does NOT pause anything.)
    //  - Picker visible (left hand showing a finger count) -> Choosing:
    //    right-hand singles are paused so the phases never fight.
    // Two-hand zoom needs both hands and is always allowed.
    const choosing = pickerState.visible;
    if (!choosing) {
      detectSwipe(ctx);
      detectPinch(ctx);
      detectPointAndTap(ctx);
      detectGrab(ctx);
    }
    detectTwoHand(ctx);

    if (emitted.length) {
      const dispatch = useGestureStore.getState().dispatch;
      for (const e of emitted) dispatch(e);
    }
  }
}
