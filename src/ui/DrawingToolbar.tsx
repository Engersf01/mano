"use client";

import type { ReactNode } from "react";
import { useDeck } from "@/store/deck";

const COLORS = ["#ffffff", "#60f5ff", "#a570ff", "#ff63d4", "#ffd28a", "#7cffb2"];

const ACTION =
  "rounded-md border border-white/15 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-white/70 transition hover:bg-white/10 hover:text-white";

function ToolBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-wider transition ${
        active
          ? "bg-white text-ink-900"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="h-5 w-px bg-white/15" />;
}

export function DrawingToolbar() {
  const drawMode = useDeck((s) => s.drawMode);
  const tool = useDeck((s) => s.tool);
  const color = useDeck((s) => s.color);
  const penWidth = useDeck((s) => s.penWidth);
  const scrim = useDeck((s) => s.scrimOpacity);
  const index = useDeck((s) => s.index);

  if (!drawMode) {
    return (
      <button
        onClick={() => useDeck.getState().toggleDrawMode()}
        className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-white/15 bg-black/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-white/70 backdrop-blur transition hover:bg-black/60 hover:text-white"
      >
        ✎ Draw
      </button>
    );
  }

  return (
    <div className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-black/50 px-3 py-2 backdrop-blur">
      <div className="flex gap-1">
        <ToolBtn active={tool === "pen"} onClick={() => useDeck.getState().setTool("pen")}>
          Pen
        </ToolBtn>
        <ToolBtn
          active={tool === "eraser"}
          onClick={() => useDeck.getState().setTool("eraser")}
        >
          Erase
        </ToolBtn>
      </div>

      <Divider />

      <div className="flex items-center gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            aria-label={`Pen color ${c}`}
            onClick={() => useDeck.getState().setColor(c)}
            className={`h-5 w-5 rounded-full ring-2 transition ${
              color === c && tool === "pen" ? "ring-white" : "ring-transparent"
            }`}
            style={{ background: c, opacity: tool === "eraser" ? 0.4 : 1 }}
          />
        ))}
      </div>

      <Divider />

      <label className="flex items-center gap-1 text-white/60">
        <span className="font-mono text-[10px] uppercase">size</span>
        <input
          type="range"
          min={1}
          max={24}
          value={penWidth}
          onChange={(e) => useDeck.getState().setPenWidth(Number(e.target.value))}
          className="w-16 accent-white"
        />
      </label>

      <Divider />

      <label className="flex items-center gap-1 text-white/60">
        <span className="font-mono text-[10px] uppercase">slide</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round((1 - scrim) * 100)}
          onChange={(e) =>
            useDeck.getState().setScrimOpacity(1 - Number(e.target.value) / 100)
          }
          className="w-16 accent-white"
        />
      </label>

      <Divider />

      <button onClick={() => useDeck.getState().addNote(index)} className={ACTION}>
        Note +
      </button>
      <button onClick={() => useDeck.getState().undoStroke(index)} className={ACTION}>
        Undo
      </button>
      <button onClick={() => useDeck.getState().clearSlide(index)} className={ACTION}>
        Clear
      </button>
      <button
        onClick={() => useDeck.getState().toggleDrawMode()}
        className="rounded-md bg-white/90 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-ink-900 transition hover:bg-white"
      >
        Done
      </button>
    </div>
  );
}
