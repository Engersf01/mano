export type Slide = {
  kicker: string;
  title: string;
  body: string;
  accent: string;
};

export const slides: Slide[] = [
  {
    kicker: "Mano v2 · Milestone 1",
    title: "Swipe to drive the deck",
    body: "Hold an open palm to the camera and swipe left or right. The arrow keys do the same thing — use them as your baseline for how navigation should feel.",
    accent: "#60f5ff",
  },
  {
    kicker: "The one rule",
    title: "Prove the gesture before the features",
    body: "No 3D, no modes, no AI. M1 exists to answer a single question: does “next slide” feel instant and reliable on a real webcam?",
    accent: "#a570ff",
  },
  {
    kicker: "How it works",
    title: "Pre-trained recognition, discrete events",
    body: "MediaPipe's GestureRecognizer runs in a web worker and reports Open_Palm directly. We only watch how the open palm moves — no hand-rolled pose math.",
    accent: "#ff63d4",
  },
  {
    kicker: "Latency, masked",
    title: "Confirm the instant it fires",
    body: "The moment a swipe is recognized, the on-screen flash appears — before the slide finishes animating. Discrete poses, never dwell timers.",
    accent: "#ffd28a",
  },
  {
    kicker: "Your turn",
    title: "Tell me how it feels",
    body: "Watch the debug readout for gesture name, confidence, and fps. If swipe feels crisp and reliable, we move to Milestone 2. If not, we tune before building anything else.",
    accent: "#7CFFB2",
  },
];
