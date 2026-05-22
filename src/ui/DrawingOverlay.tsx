"use client";

import { useEffect, useRef } from "react";
import { useDeck, type Note, type Stroke } from "@/store/deck";

const EMPTY_NOTES: Note[] = [];

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  w: number,
  h: number,
) {
  if (stroke.points.length === 0) return;
  ctx.globalCompositeOperation =
    stroke.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.beginPath();
  const first = stroke.points[0];
  ctx.moveTo(first.x * w, first.y * h);
  if (stroke.points.length === 1) {
    // A single tap: nudge so the round cap paints a dot.
    ctx.lineTo(first.x * w + 0.1, first.y * h + 0.1);
  } else {
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x * w, stroke.points[i].y * h);
    }
  }
  ctx.stroke();
}

export function DrawingOverlay() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const inProgress = useRef<Stroke | null>(null);

  const index = useDeck((s) => s.index);
  const drawMode = useDeck((s) => s.drawMode);
  const tool = useDeck((s) => s.tool);
  const color = useDeck((s) => s.color);
  const penWidth = useDeck((s) => s.penWidth);
  const strokes = useDeck((s) => s.strokesBySlide[index]);
  const notes = useDeck((s) => s.notesBySlide[index] ?? EMPTY_NOTES);

  function redraw() {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);
    const state = useDeck.getState();
    const list = state.strokesBySlide[state.index] ?? [];
    for (const stroke of list) drawStroke(ctx, stroke, w, h);
    ctx.globalCompositeOperation = "source-over";
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      sizeRef.current = { w, h };
      redraw();
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Replay the current slide's strokes whenever the slide or its ink changes.
  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, strokes]);

  const toNorm = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const onDown = (e: React.PointerEvent) => {
    if (!drawMode) return;
    canvasRef.current?.setPointerCapture(e.pointerId);
    inProgress.current = {
      tool,
      color,
      width: tool === "eraser" ? penWidth * 6 : penWidth,
      points: [toNorm(e)],
    };
  };

  const onMove = (e: React.PointerEvent) => {
    const stroke = inProgress.current;
    if (!stroke) return;
    const pt = toNorm(e);
    const prev = stroke.points[stroke.points.length - 1];
    stroke.points.push(pt);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    ctx.globalCompositeOperation =
      stroke.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    ctx.moveTo(prev.x * w, prev.y * h);
    ctx.lineTo(pt.x * w, pt.y * h);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  };

  const onUp = () => {
    const stroke = inProgress.current;
    if (!stroke) return;
    inProgress.current = null;
    useDeck.getState().addStroke(useDeck.getState().index, stroke);
  };

  const startNoteDrag = (e: React.PointerEvent, note: Note) => {
    e.stopPropagation();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const originX = note.x;
    const originY = note.y;
    const slide = useDeck.getState().index;
    const move = (ev: PointerEvent) => {
      const nx = originX + (ev.clientX - startX) / rect.width;
      const ny = originY + (ev.clientY - startY) / rect.height;
      useDeck.getState().updateNote(slide, note.id, {
        x: Math.min(0.95, Math.max(0, nx)),
        y: Math.min(0.95, Math.max(0, ny)),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const cursor = drawMode ? (tool === "eraser" ? "cell" : "crosshair") : "default";

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0 z-10">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{
          pointerEvents: drawMode ? "auto" : "none",
          touchAction: "none",
          cursor,
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      />

      {notes.map((note) => (
        <div
          key={note.id}
          className="absolute w-48 select-none rounded-md bg-amber-200 text-ink-900 shadow-xl ring-1 ring-black/10"
          style={{
            left: `${note.x * 100}%`,
            top: `${note.y * 100}%`,
            pointerEvents: drawMode ? "auto" : "none",
          }}
        >
          <div
            onPointerDown={(e) => startNoteDrag(e, note)}
            className="flex cursor-move items-center justify-between rounded-t-md bg-amber-300/90 px-2 py-1"
          >
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-900/60">
              note
            </span>
            <button
              aria-label="Delete note"
              onClick={() =>
                useDeck.getState().removeNote(useDeck.getState().index, note.id)
              }
              className="text-ink-900/60 transition hover:text-ink-900"
            >
              ×
            </button>
          </div>
          <textarea
            value={note.text}
            placeholder="Type…"
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) =>
              useDeck
                .getState()
                .updateNote(useDeck.getState().index, note.id, {
                  text: e.target.value,
                })
            }
            className="h-24 w-full resize-none rounded-b-md bg-amber-200 p-2 text-sm text-ink-900 outline-none placeholder:text-ink-900/40"
          />
        </div>
      ))}
    </div>
  );
}
