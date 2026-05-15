import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const formatTime = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export const accentToHex = (a?: "cyan" | "violet" | "pink" | "gold") => {
  switch (a) {
    case "violet":
      return "#a570ff";
    case "pink":
      return "#ff63d4";
    case "gold":
      return "#ffd28a";
    case "cyan":
    default:
      return "#60f5ff";
  }
};
