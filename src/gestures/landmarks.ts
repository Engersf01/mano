import type { Hand, Landmark } from "@/perception/types";

export const L = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_TIP: 12,
  RING_TIP: 16,
  PINKY_TIP: 20,
} as const;

export const dist = (a: Landmark, b: Landmark) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const dist3 = (a: Landmark, b: Landmark) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export const pinchDistance = (h: Hand) =>
  dist(h.landmarks[L.THUMB_TIP], h.landmarks[L.INDEX_TIP]);

export const handSize = (h: Hand) =>
  dist(h.landmarks[L.WRIST], h.landmarks[L.MIDDLE_MCP]);

export const fingerCurl = (h: Hand): { i: number; m: number; r: number; p: number } => {
  const w = h.landmarks[L.WRIST];
  const ref = handSize(h) || 1;
  const measure = (tip: number, mcp: number) =>
    dist(h.landmarks[mcp], h.landmarks[tip]) / ref;
  return {
    i: measure(L.INDEX_TIP, L.INDEX_MCP),
    m: measure(L.MIDDLE_TIP, L.MIDDLE_MCP),
    r: measure(L.RING_TIP, 13),
    p: measure(L.PINKY_TIP, 17),
  };
};

export const isPointing = (h: Hand) => {
  const c = fingerCurl(h);
  return c.i > 1.4 && c.m < 1.05 && c.r < 1.05 && c.p < 1.1;
};

export const isOpenPalm = (h: Hand) => {
  const c = fingerCurl(h);
  return c.i > 1.4 && c.m > 1.4 && c.r > 1.3 && c.p > 1.2;
};

export const isFist = (h: Hand) => {
  const c = fingerCurl(h);
  return c.i < 1.1 && c.m < 1.1 && c.r < 1.1 && c.p < 1.15;
};

export const palmCenter = (h: Hand): Landmark => {
  const a = h.landmarks[L.WRIST];
  const b = h.landmarks[L.INDEX_MCP];
  const c = h.landmarks[L.MIDDLE_MCP];
  const d = h.landmarks[17]; // pinky MCP
  return {
    x: (a.x + b.x + c.x + d.x) / 4,
    y: (a.y + b.y + c.y + d.y) / 4,
    z: (a.z + b.z + c.z + d.z) / 4,
  };
};
