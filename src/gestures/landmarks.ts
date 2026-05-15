import type { Hand, Landmark } from "@/perception/types";

export const L = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

export const dist = (a: Landmark, b: Landmark) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const dist3 = (a: Landmark, b: Landmark) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export const handSize = (h: Hand) =>
  dist(h.landmarks[L.WRIST], h.landmarks[L.MIDDLE_MCP]);

export const pinchDistance = (h: Hand) =>
  dist(h.landmarks[L.THUMB_TIP], h.landmarks[L.INDEX_TIP]);

function angleAt(a: Landmark, b: Landmark, c: Landmark): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const n1 = Math.hypot(v1x, v1y);
  const n2 = Math.hypot(v2x, v2y);
  if (n1 < 1e-6 || n2 < 1e-6) return 0;
  const cos = (v1x * v2x + v1y * v2y) / (n1 * n2);
  return Math.acos(Math.max(-1, Math.min(1, cos)));
}

function fingerExtended(
  h: Hand,
  mcp: number,
  pip: number,
  dip: number,
  tip: number,
): boolean {
  const a = h.landmarks[mcp];
  const b = h.landmarks[pip];
  const c = h.landmarks[dip];
  const d = h.landmarks[tip];
  const pipAngle = angleAt(a, b, c);
  const dipAngle = angleAt(b, c, d);
  const wrist = h.landmarks[L.WRIST];
  const tipFar = dist(wrist, d) >= dist(wrist, b) * 0.9;
  // Straight: angle near π. Curled: angle drops below ~1.7 rad (≈97°).
  return pipAngle > 1.7 && dipAngle > 1.7 && tipFar;
}

function thumbExtended(h: Hand): boolean {
  const cmc = h.landmarks[L.THUMB_CMC];
  const mcp = h.landmarks[L.THUMB_MCP];
  const ip = h.landmarks[L.THUMB_IP];
  const tip = h.landmarks[L.THUMB_TIP];
  const a1 = angleAt(cmc, mcp, ip);
  const a2 = angleAt(mcp, ip, tip);
  const wrist = h.landmarks[L.WRIST];
  const indexMcp = h.landmarks[L.INDEX_MCP];
  const palm = dist(wrist, indexMcp) || 1;
  const tipAway = dist(indexMcp, tip) > palm * 0.6;
  return a1 > 2.6 && a2 > 2.6 && tipAway;
}

export type FingerStates = {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
  extendedCount: number;
};

export function fingerStates(h: Hand): FingerStates {
  const index = fingerExtended(h, L.INDEX_MCP, L.INDEX_PIP, L.INDEX_DIP, L.INDEX_TIP);
  const middle = fingerExtended(h, L.MIDDLE_MCP, L.MIDDLE_PIP, L.MIDDLE_DIP, L.MIDDLE_TIP);
  const ring = fingerExtended(h, L.RING_MCP, L.RING_PIP, L.RING_DIP, L.RING_TIP);
  const pinky = fingerExtended(h, L.PINKY_MCP, L.PINKY_PIP, L.PINKY_DIP, L.PINKY_TIP);
  const thumb = thumbExtended(h);
  return {
    thumb,
    index,
    middle,
    ring,
    pinky,
    extendedCount: [thumb, index, middle, ring, pinky].filter(Boolean).length,
  };
}

export const isOpenPalm = (h: Hand) => {
  const s = fingerStates(h);
  // Accept "mostly open" — at least 3 of 4 long fingers extended.
  const open = [s.index, s.middle, s.ring, s.pinky].filter(Boolean).length;
  return open >= 3;
};

export const isFist = (h: Hand) => {
  const s = fingerStates(h);
  return !s.index && !s.middle && !s.ring && !s.pinky;
};

export const isPointing = (h: Hand) => {
  const s = fingerStates(h);
  // Index extended, middle clearly curled. Ring/pinky don't need to be perfect.
  return s.index && !s.middle;
};

export const palmCenter = (h: Hand): Landmark => {
  const a = h.landmarks[L.WRIST];
  const b = h.landmarks[L.INDEX_MCP];
  const c = h.landmarks[L.MIDDLE_MCP];
  const d = h.landmarks[L.PINKY_MCP];
  return {
    x: (a.x + b.x + c.x + d.x) / 4,
    y: (a.y + b.y + c.y + d.y) / 4,
    z: (a.z + b.z + c.z + d.z) / 4,
  };
};
