export type Landmark = { x: number; y: number; z: number };

export type Handedness = "Left" | "Right";

export type Hand = {
  handedness: Handedness;
  score: number;
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
};

export type HandFrame = {
  t: number;
  hands: Hand[];
  width: number;
  height: number;
};

export type WorkerInbound =
  | { type: "init"; wasmBase: string }
  | { type: "frame"; bitmap: ImageBitmap; t: number; width: number; height: number }
  | { type: "dispose" };

export type WorkerOutbound =
  | { type: "ready" }
  | { type: "frame"; payload: HandFrame }
  | { type: "error"; message: string };
