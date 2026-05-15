"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  MousePointer2,
  Crosshair,
  PenTool,
  Highlighter,
  Square,
  ArrowRight,
  StickyNote,
  Eraser,
  Type,
} from "lucide-react";
import { useToolsStore, type ToolName } from "@/store/tools";
import { useAnnotationStore } from "@/store/annotation";
import { useDeckStore } from "@/store/deck";
import { cn } from "@/lib/utils";

const TOOLS: { name: ToolName; label: string; Icon: typeof PenTool }[] = [
  { name: "cursor", label: "Cursor", Icon: MousePointer2 },
  { name: "laser", label: "Laser", Icon: Crosshair },
  { name: "pen", label: "Pen", Icon: PenTool },
  { name: "marker", label: "Marker", Icon: PenTool },
  { name: "highlight", label: "Highlight", Icon: Highlighter },
  { name: "shape", label: "Shape", Icon: Square },
  { name: "arrow", label: "Arrow", Icon: ArrowRight },
  { name: "sticky", label: "Sticky", Icon: StickyNote },
  { name: "text", label: "Text", Icon: Type },
  { name: "eraser", label: "Eraser", Icon: Eraser },
];

const SWATCHES = ["#60f5ff", "#a570ff", "#ff63d4", "#ffd28a", "#ffffff", "#000000"];

export function Toolbox() {
  const active = useToolsStore((s) => s.active);
  const color = useToolsStore((s) => s.color);
  const thickness = useToolsStore((s) => s.thickness);
  const setActive = useToolsStore((s) => s.setActive);
  const setColor = useToolsStore((s) => s.setColor);
  const setThickness = useToolsStore((s) => s.setThickness);
  const show = useToolsStore((s) => s.showToolbox);
  const undo = useAnnotationStore((s) => s.undo);
  const redo = useAnnotationStore((s) => s.redo);
  const clear = useAnnotationStore((s) => s.clearSlide);
  const slide = useDeckStore((s) => s.deck?.slides[s.index]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="pointer-events-auto absolute bottom-6 left-1/2 z-40 -translate-x-1/2"
        >
          <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-ink-900/70 p-1.5 backdrop-blur-2xl shadow-glow">
            {TOOLS.map((t) => (
              <button
                key={t.name}
                title={t.label}
                onClick={() => setActive(t.name)}
                className={cn(
                  "group flex h-10 w-10 items-center justify-center rounded-xl text-ink-200 transition-all",
                  active === t.name
                    ? "bg-aurora-cyan/15 text-aurora-cyan shadow-[inset_0_0_0_1px_rgba(96,245,255,0.4)]"
                    : "hover:bg-white/5 hover:text-white",
                )}
              >
                <t.Icon size={16} />
              </button>
            ))}
            <div className="mx-1 h-7 w-px bg-white/10" />
            {SWATCHES.map((c) => (
              <button
                key={c}
                title={c}
                onClick={() => setColor(c)}
                className={cn(
                  "h-6 w-6 rounded-full border transition-transform",
                  color === c ? "scale-110 border-white" : "border-white/20",
                )}
                style={{ background: c, boxShadow: color === c ? `0 0 16px ${c}` : "none" }}
              />
            ))}
            <div className="mx-1 h-7 w-px bg-white/10" />
            <input
              aria-label="thickness"
              type="range"
              min={1}
              max={24}
              value={thickness}
              onChange={(e) => setThickness(Number(e.target.value))}
              className="w-24 accent-aurora-cyan"
            />
            <div className="mx-1 h-7 w-px bg-white/10" />
            <button
              className="rounded-lg px-2.5 py-1 text-[11px] uppercase tracking-wider text-ink-200 hover:bg-white/5 hover:text-white"
              onClick={() => slide && undo(slide.id)}
            >
              Undo
            </button>
            <button
              className="rounded-lg px-2.5 py-1 text-[11px] uppercase tracking-wider text-ink-200 hover:bg-white/5 hover:text-white"
              onClick={() => slide && redo(slide.id)}
            >
              Redo
            </button>
            <button
              className="rounded-lg px-2.5 py-1 text-[11px] uppercase tracking-wider text-ink-200 hover:bg-rose-500/20 hover:text-rose-200"
              onClick={() => slide && clear(slide.id)}
            >
              Clear
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
