"use client";
import { useEffect, useRef } from "react";
import { useGestureStore } from "@/store/gesture";

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export function HandsOverlay({ mirror = true }: { mirror?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf: number;
    const draw = () => {
      const cvs = ref.current;
      if (!cvs) return;
      const frame = useGestureStore.getState().frame;
      const ctx = cvs.getContext("2d");
      if (!ctx) return;
      const w = (cvs.width = cvs.clientWidth * devicePixelRatio);
      const h = (cvs.height = cvs.clientHeight * devicePixelRatio);
      ctx.clearRect(0, 0, w, h);
      if (frame) {
        for (const hand of frame.hands) {
          const color = hand.handedness === "Right" ? "#60f5ff" : "#a570ff";
          ctx.strokeStyle = color;
          ctx.fillStyle = color;
          ctx.lineWidth = 2 * devicePixelRatio;
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
          for (const [a, b] of CONNECTIONS) {
            const A = hand.landmarks[a];
            const B = hand.landmarks[b];
            if (!A || !B) continue;
            ctx.beginPath();
            ctx.moveTo(mirror ? (1 - A.x) * w : A.x * w, A.y * h);
            ctx.lineTo(mirror ? (1 - B.x) * w : B.x * w, B.y * h);
            ctx.stroke();
          }
          for (const p of hand.landmarks) {
            ctx.beginPath();
            ctx.arc(
              mirror ? (1 - p.x) * w : p.x * w,
              p.y * h,
              3 * devicePixelRatio,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mirror]);
  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
