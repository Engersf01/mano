"use client";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToolsStore, type ToolName } from "@/store/tools";
import { useSceneStore } from "@/store/scene";
import { useGestureStore } from "@/store/gesture";
import {
  Aperture,
  Brain,
  Earth,
  Layers3,
  Move3d,
  Rewind,
  Sparkles,
  Type,
  PenTool,
  Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  label: string;
  key: string;
  Icon: typeof Aperture;
  action: () => void;
};

const DWELL_MS = 1000;
const MIN_RADIUS_PX = 60;
const MENU_RADIUS_PX = 170;

export function RadialMenu() {
  const open = useToolsStore((s) => s.showRadial);
  const setOpen = useToolsStore((s) => s.setRadial);
  const setActive = useToolsStore((s) => s.setActive);
  const setMode = useSceneStore((s) => s.setMode);

  const [hovered, setHovered] = useState(-1);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [cursor, setCursor] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

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

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  // Track latest hovered in a ref so the air-tap listener picks up the
  // current value without re-subscribing.
  const hoveredRef = useRef(hovered);
  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  // Stable refs to items + actions for the gesture listener.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Air-tap (or quick pinch / quick fist-and-open) confirms selection.
  useEffect(() => {
    if (!open) return;
    const off = useGestureStore.getState().on((e) => {
      if (e.name !== "air-tap") return;
      const idx = hoveredRef.current;
      if (idx >= 0 && idx < itemsRef.current.length) {
        itemsRef.current[idx].action();
      }
    });
    return off;
  }, [open]);

  // RAF loop: read pointer, compute which item the finger points at,
  // advance a dwell timer when steady on one item.
  useEffect(() => {
    if (!open) {
      setHovered(-1);
      setDwellProgress(0);
      setCursor({ x: 0, y: 0, active: false });
      return;
    }
    let raf = 0;
    let dwellStart = 0;
    let lastIndex = -1;
    const N = items.length;

    const tick = () => {
      const p = useGestureStore.getState().pointer;
      if (!p.active) {
        if (lastIndex !== -1) {
          lastIndex = -1;
          dwellStart = 0;
          setHovered(-1);
          setDwellProgress(0);
        }
        setCursor({ x: 0, y: 0, active: false });
        raf = requestAnimationFrame(tick);
        return;
      }

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const px = p.x * window.innerWidth;
      const py = p.y * window.innerHeight;
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy);
      setCursor({ x: px, y: py, active: true });

      let idx = -1;
      if (dist > MIN_RADIUS_PX) {
        let normalized = Math.atan2(dy, dx) + Math.PI / 2;
        while (normalized < 0) normalized += 2 * Math.PI;
        while (normalized >= 2 * Math.PI) normalized -= 2 * Math.PI;
        idx = Math.round((normalized / (2 * Math.PI)) * N) % N;
      }

      const now = performance.now();
      if (idx !== lastIndex) {
        lastIndex = idx;
        dwellStart = now;
        setHovered(idx);
        setDwellProgress(0);
      } else if (idx >= 0) {
        const elapsed = now - dwellStart;
        const progress = Math.min(1, elapsed / DWELL_MS);
        setDwellProgress(progress);
        if (progress >= 1) {
          // Trigger and exit
          dwellStart = Number.MAX_SAFE_INTEGER;
          itemsRef.current[idx].action();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, items.length]);

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
              const x = Math.cos(angle) * MENU_RADIUS_PX;
              const y = Math.sin(angle) * MENU_RADIUS_PX;
              const isHovered = hovered === i;
              return (
                <motion.button
                  key={item.key}
                  onClick={(e: ReactMouseEvent) => {
                    e.stopPropagation();
                    item.action();
                  }}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                  animate={{
                    opacity: 1,
                    x,
                    y,
                    scale: isHovered ? 1.18 : 1,
                  }}
                  exit={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                  transition={{
                    delay: isHovered ? 0 : 0.04 + i * 0.03,
                    type: "spring",
                    stiffness: 260,
                    damping: 22,
                  }}
                  className={cn(
                    "absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-2xl border bg-ink-900/70 backdrop-blur-2xl",
                    isHovered
                      ? "border-aurora-cyan/60 text-aurora-cyan shadow-glow"
                      : "border-white/10 text-ink-100 hover:border-aurora-cyan/40 hover:text-aurora-cyan hover:shadow-glow",
                  )}
                >
                  <item.Icon size={18} />
                  <span className="text-[10px] uppercase tracking-wider">
                    {item.label}
                  </span>
                  {isHovered && dwellProgress > 0 && (
                    <span
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      style={{
                        background: `conic-gradient(from -90deg, #60f5ff ${dwellProgress * 360}deg, transparent ${dwellProgress * 360}deg)`,
                        mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                        WebkitMask:
                          "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                        maskComposite: "exclude",
                        WebkitMaskComposite: "xor" as unknown as string,
                        padding: 2,
                        opacity: 0.85,
                      }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
          {cursor.active && (
            <div
              className="pointer-events-none fixed z-[60] h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-aurora-cyan"
              style={{
                left: cursor.x,
                top: cursor.y,
                boxShadow: "0 0 24px #60f5ff, 0 0 60px #60f5ff80",
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
