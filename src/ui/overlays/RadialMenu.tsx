"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToolsStore, type ToolName } from "@/store/tools";
import { useSceneStore } from "@/store/scene";
import {
  Aperture, Brain, Earth, Layers3, Move3d, Rewind, Sparkles, Type, PenTool, Crosshair,
} from "lucide-react";

type Item = { label: string; key: string; Icon: typeof Aperture; action: () => void };

export function RadialMenu() {
  const open = useToolsStore((s) => s.showRadial);
  const setOpen = useToolsStore((s) => s.setRadial);
  const setActive = useToolsStore((s) => s.setActive);
  const setMode = useSceneStore((s) => s.setMode);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  const tool = (t: ToolName) => () => {
    setActive(t);
    setOpen(false);
  };
  const mode = (m: Parameters<typeof setMode>[0]) => () => {
    setMode(m);
    setOpen(false);
  };
  const items: Item[] = [
    { label: "Spatial", key: "spatial", Icon: Move3d, action: mode("spatial") },
    { label: "Brain", key: "brain", Icon: Brain, action: mode("brain") },
    { label: "Globe", key: "globe", Icon: Earth, action: mode("globe") },
    { label: "Timeline", key: "timeline", Icon: Rewind, action: mode("timeline") },
    { label: "Zoom", key: "zoom", Icon: Layers3, action: mode("zoom") },
    { label: "Classic", key: "classic", Icon: Aperture, action: mode("classic") },
    { label: "Laser", key: "laser", Icon: Crosshair, action: tool("laser") },
    { label: "Pen", key: "pen", Icon: PenTool, action: tool("pen") },
    { label: "Sticky", key: "sticky", Icon: Sparkles, action: tool("sticky") },
    { label: "Text", key: "text", Icon: Type, action: tool("text") },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-xl" />
          <div className="relative h-[420px] w-[420px]">
            <motion.div
              className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2"
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.6 }}
            >
              <div className="flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-ink-900/80 text-aurora-cyan shadow-glow">
                <Sparkles />
              </div>
            </motion.div>
            {items.map((item, i) => {
              const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
              const r = 170;
              const x = Math.cos(angle) * r;
              const y = Math.sin(angle) * r;
              return (
                <motion.button
                  key={item.key}
                  onClick={(e) => {
                    e.stopPropagation();
                    item.action();
                  }}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                  animate={{ opacity: 1, x, y, scale: 1 }}
                  exit={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                  transition={{
                    delay: 0.04 + i * 0.03,
                    type: "spring",
                    stiffness: 260,
                    damping: 22,
                  }}
                  className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-ink-900/70 text-ink-100 backdrop-blur-2xl hover:border-aurora-cyan/40 hover:text-aurora-cyan hover:shadow-glow"
                >
                  <item.Icon size={18} />
                  <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
