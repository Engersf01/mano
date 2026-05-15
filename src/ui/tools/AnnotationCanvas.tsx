"use client";
import { useEffect, useRef } from "react";
import { useAnnotationStore } from "@/store/annotation";
import { useDeckStore } from "@/store/deck";
import { useToolsStore } from "@/store/tools";
import { useGestureStore } from "@/store/gesture";

export function AnnotationCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const liveStrokeId = useRef<string | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let raf: number;
    const draw = () => {
      const cvs = ref.current;
      if (!cvs) return;
      const ctx = cvs.getContext("2d");
      if (!ctx) return;
      const w = (cvs.width = cvs.clientWidth * devicePixelRatio);
      const h = (cvs.height = cvs.clientHeight * devicePixelRatio);
      ctx.clearRect(0, 0, w, h);
      const deck = useDeckStore.getState();
      const ann = useAnnotationStore.getState();
      const tools = useToolsStore.getState();
      const slide = deck.deck?.slides[deck.index];
      if (!slide) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const layer = ann.layers[slide.id];
      if (layer) {
        for (const s of layer.strokes) {
          ctx.globalAlpha = s.opacity;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.thickness * devicePixelRatio;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.shadowColor = s.tool === "marker" ? s.color : "transparent";
          ctx.shadowBlur = s.tool === "marker" ? 6 : 0;
          ctx.beginPath();
          s.points.forEach((p, i) => {
            const x = p.x * w;
            const y = p.y * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }
        for (const sh of layer.shapes) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = sh.color;
          ctx.lineWidth = sh.thickness * devicePixelRatio;
          if (sh.kind === "rect")
            ctx.strokeRect(sh.x * w, sh.y * h, sh.w * w, sh.h * h);
          else if (sh.kind === "circle") {
            ctx.beginPath();
            ctx.ellipse(
              (sh.x + sh.w / 2) * w,
              (sh.y + sh.h / 2) * h,
              (sh.w / 2) * w,
              (sh.h / 2) * h,
              0,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.moveTo(sh.x * w, sh.y * h);
            ctx.lineTo((sh.x + sh.w) * w, (sh.y + sh.h) * h);
            ctx.stroke();
            if (sh.kind === "arrow") {
              const ang = Math.atan2(sh.h * h, sh.w * w);
              const ax = (sh.x + sh.w) * w;
              const ay = (sh.y + sh.h) * h;
              const len = 14 * devicePixelRatio;
              ctx.beginPath();
              ctx.moveTo(ax, ay);
              ctx.lineTo(ax - len * Math.cos(ang - 0.4), ay - len * Math.sin(ang - 0.4));
              ctx.moveTo(ax, ay);
              ctx.lineTo(ax - len * Math.cos(ang + 0.4), ay - len * Math.sin(ang + 0.4));
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;
      }
      if (tools.active === "laser") {
        const p = useGestureStore.getState().pointer;
        if (p.active) {
          const x = p.x * w;
          const y = p.y * h;
          const grad = ctx.createRadialGradient(x, y, 0, x, y, 40 * devicePixelRatio);
          grad.addColorStop(0, "rgba(255,80,80,0.95)");
          grad.addColorStop(0.4, "rgba(255,80,80,0.45)");
          grad.addColorStop(1, "rgba(255,80,80,0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, 40 * devicePixelRatio, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const off = useGestureStore.getState().on((e) => {
      const tool = useToolsStore.getState().active;
      const slide = useDeckStore.getState().deck?.slides[useDeckStore.getState().index];
      if (!slide) return;
      if (!["pen", "marker", "highlight"].includes(tool)) return;
      if (e.name === "pinch" && e.data) {
        const x = e.data.x;
        const y = e.data.y;
        if (e.phase === "start") {
          const id = useAnnotationStore.getState().beginStroke({
            slideId: slide.id,
            tool: tool as "pen" | "marker" | "highlight",
            color: useToolsStore.getState().color,
            thickness: useToolsStore.getState().thickness,
            opacity: tool === "highlight" ? 0.35 : 1,
          });
          liveStrokeId.current = id;
          lastPoint.current = { x, y };
          useAnnotationStore.getState().appendPoint(id, { x, y });
        } else if (e.phase === "active" && liveStrokeId.current) {
          useAnnotationStore.getState().appendPoint(liveStrokeId.current, { x, y });
        } else if (e.phase === "end" && liveStrokeId.current) {
          useAnnotationStore.getState().commitStroke(liveStrokeId.current);
          liveStrokeId.current = null;
        }
      }
    });
    return off;
  }, []);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    let drawing = false;
    let strokeId: string | null = null;
    const tooled = (tool: string) => ["pen", "marker", "highlight"].includes(tool);
    const onDown = (e: PointerEvent) => {
      const tool = useToolsStore.getState().active;
      if (!tooled(tool)) return;
      const slide = useDeckStore.getState().deck?.slides[useDeckStore.getState().index];
      if (!slide) return;
      drawing = true;
      const rect = cvs.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      strokeId = useAnnotationStore.getState().beginStroke({
        slideId: slide.id,
        tool: tool as "pen" | "marker" | "highlight",
        color: useToolsStore.getState().color,
        thickness: useToolsStore.getState().thickness,
        opacity: tool === "highlight" ? 0.35 : 1,
      });
      useAnnotationStore.getState().appendPoint(strokeId, { x, y });
    };
    const onMove = (e: PointerEvent) => {
      if (!drawing || !strokeId) return;
      const rect = cvs.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      useAnnotationStore.getState().appendPoint(strokeId, { x, y });
    };
    const onUp = () => {
      drawing = false;
      if (strokeId) useAnnotationStore.getState().commitStroke(strokeId);
      strokeId = null;
    };
    cvs.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      cvs.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const active = useToolsStore((s) => s.active);
  const interactive = ["pen", "marker", "highlight", "shape", "arrow"].includes(active);
  return (
    <canvas
      ref={ref}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: interactive ? "auto" : "none" }}
    />
  );
}
