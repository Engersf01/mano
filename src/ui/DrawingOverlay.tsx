"use client";

import { useEffect, useRef } from "react";
import {
  useDeck,
  type Note,
  type Point,
  type Stroke,
  type Tool,
} from "@/store/deck";
import { getHandSample } from "@/perception/handChannel";

const EMPTY_NOTES: Note[] = [];

// Gesture → action mapping for hands-free drawing.
const TOGGLE_GESTURE = "Victory"; // ✌️ show / hide the drawing layer
const PEN_GESTURE = "Pointing_Up"; // ☝️ draw at the index fingertip
const ERASE_GESTURE = "Closed_Fist"; // ✊ erase
const MIN_SCORE = 0.4; // ignore low-confidence poses
const TOGGLE_SCORE = 0.6; // be stricter about the toggle
const TOGGLE_COOLDOWN_MS = 1000; // debounce the on/off pose
const LIFT_GRACE = 4; // frames of non-pen before the pen lifts
const SMOOTH = 0.5; // fingertip smoothing (1 = none)

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

function drawSegment(
  ctx: CanvasRenderingContext2D,
  prev: Point,
  pt: Point,
  stroke: Stroke,
  w: number,
  h: number,
) {
  ctx.globalCompositeOperation =
    stroke.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.beginPath();
  ctx.moveTo(prev.x * w, prev.y * h);
  ctx.lineTo(pt.x * w, pt.y * h);
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
}

export function DrawingOverlay() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const inProgress = useRef<Stroke | null>(null);

  // Gesture-drawing state (lives in refs so the camera loop never re-renders).
  const gStroke = useRef<Stroke | null>(null);
  const gSlide = useRef(0);
  const lift = useRef(0);
  const prevGesture = useRef("");
  const lastToggle = useRef(0);
  const smooth = useRef<Point | null>(null);
  const lastSampleTs = useRef(0);

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

  function commitGestureStroke() {
    const stroke = gStroke.current;
    gStroke.current = null;
    lift.current = 0;
    if (stroke && stroke.points.length > 0) {
      useDeck.getState().addStroke(gSlide.current, stroke);
    }
  }

  // Hands-free drawing: read the latest fingertip every frame and drive the
  // canvas directly, mirroring the pointer path but never touching React state.
  useEffect(() => {
    let raf = 0;
    const hideCursor = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = "0";
    };
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const state = useDeck.getState();
      const sample = getHandSample();
      const fresh = sample !== null && sample.timestamp !== lastSampleTs.current;
      if (sample) lastSampleTs.current = sample.timestamp;

      // ✌️ toggles the drawing layer — edge-triggered + debounced.
      if (
        fresh &&
        sample.gesture === TOGGLE_GESTURE &&
        prevGesture.current !== TOGGLE_GESTURE &&
        sample.score >= TOGGLE_SCORE
      ) {
        const now = performance.now();
        if (now - lastToggle.current > TOGGLE_COOLDOWN_MS) {
          lastToggle.current = now;
          commitGestureStroke();
          state.toggleDrawMode();
        }
      }
      if (fresh) prevGesture.current = sample.gesture;

      if (!state.drawMode) {
        commitGestureStroke();
        hideCursor();
        smooth.current = null;
        return;
      }
      if (!fresh) return; // nothing new from the camera this frame

      const handPresent =
        sample.gesture !== "" && sample.gesture !== "None";
      if (!handPresent) {
        hideCursor();
        smooth.current = null;
        lift.current += 1;
        if (lift.current >= LIFT_GRACE) commitGestureStroke();
        return;
      }

      // Index fingertip → mirrored, lightly smoothed, screen-normalized point.
      const raw = { x: 1 - sample.indexX, y: sample.indexY };
      const pt: Point = smooth.current
        ? {
            x: smooth.current.x + (raw.x - smooth.current.x) * SMOOTH,
            y: smooth.current.y + (raw.y - smooth.current.y) * SMOOTH,
          }
        : raw;
      smooth.current = pt;

      let tool: Tool | null = null;
      if (sample.gesture === PEN_GESTURE && sample.score >= MIN_SCORE)
        tool = "pen";
      else if (sample.gesture === ERASE_GESTURE && sample.score >= MIN_SCORE)
        tool = "eraser";

      const cur = cursorRef.current;
      if (cur) {
        cur.style.opacity = "1";
        cur.style.left = `${pt.x * 100}%`;
        cur.style.top = `${pt.y * 100}%`;
        const dim = tool === "eraser" ? 28 : Math.max(8, state.penWidth * 2);
        cur.style.width = `${dim}px`;
        cur.style.height = `${dim}px`;
        cur.style.background = tool === "eraser" ? "transparent" : state.color;
        cur.style.borderColor =
          tool === "pen" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.9)";
      }

      if (!tool) {
        lift.current += 1;
        if (lift.current >= LIFT_GRACE) commitGestureStroke();
        return;
      }

      lift.current = 0;
      const width = tool === "eraser" ? state.penWidth * 6 : state.penWidth;
      const active = gStroke.current;
      if (!active || active.tool !== tool) {
        commitGestureStroke();
        gSlide.current = state.index;
        gStroke.current = { tool, color: state.color, width, points: [pt] };
      } else {
        const prev = active.points[active.points.length - 1];
        active.points.push(pt);
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx)
          drawSegment(ctx, prev, pt, active, sizeRef.current.w, sizeRef.current.h);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    drawSegment(ctx, prev, pt, stroke, w, h);
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

      {/* Fingertip cursor for gesture drawing (positioned imperatively). */}
      <div
        ref={cursorRef}
        className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-0 shadow"
        style={{ transition: "opacity 120ms" }}
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
