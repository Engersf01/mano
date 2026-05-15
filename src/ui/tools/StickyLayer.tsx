"use client";
import { useDeckStore } from "@/store/deck";
import { useAnnotationStore } from "@/store/annotation";
import { useEffect, useRef, useState } from "react";

export function StickyLayer() {
  const slide = useDeckStore((s) => s.deck?.slides[s.index]);
  const stickies = useAnnotationStore((s) =>
    slide ? s.layers[slide.id]?.stickies ?? [] : [],
  );
  if (!slide) return null;
  return (
    <div className="pointer-events-none absolute inset-0">
      {stickies.map((n) => (
        <Sticky key={n.id} id={n.id} />
      ))}
    </div>
  );
}

function Sticky({ id }: { id: string }) {
  const note = useAnnotationStore((s) => {
    for (const layer of Object.values(s.layers)) {
      const found = layer.stickies.find((n) => n.id === id);
      if (found) return found;
    }
    return null;
  });
  const update = useAnnotationStore((s) => s.updateSticky);
  const remove = useAnnotationStore((s) => s.removeSticky);
  const drag = useRef<{ ox: number; oy: number } | null>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!drag.current || !note) return;
      update(note.id, {
        x: (e.clientX - drag.current.ox) / window.innerWidth,
        y: (e.clientY - drag.current.oy) / window.innerHeight,
      });
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [note, update]);
  if (!note) return null;
  return (
    <div
      className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 select-none"
      style={{
        left: `${note.x * 100}%`,
        top: `${note.y * 100}%`,
        width: `${note.width * 100}%`,
        height: note.collapsed ? 36 : `${note.height * 100}%`,
      }}
    >
      <div
        className="flex h-full flex-col overflow-hidden rounded-xl border border-white/15 shadow-glow"
        style={{ background: `${note.color}ee`, color: "#0a0e1d" }}
      >
        <div
          className="flex h-9 cursor-grab items-center justify-between px-3"
          style={{ background: "rgba(0,0,0,0.08)" }}
          onPointerDown={(e) => {
            const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
            drag.current = { ox: e.clientX - rect.left, oy: e.clientY - rect.top - rect.height / 2 + 18 };
          }}
        >
          <span className="text-xs font-medium tracking-wide">sticky</span>
          <div className="flex gap-1">
            <button
              className="text-[10px] uppercase opacity-80 hover:opacity-100"
              onClick={() => update(note.id, { collapsed: !note.collapsed })}
            >
              {note.collapsed ? "expand" : "collapse"}
            </button>
            <button
              className="text-[10px] uppercase opacity-80 hover:opacity-100"
              onClick={() => remove(note.id)}
            >
              ×
            </button>
          </div>
        </div>
        {!note.collapsed && (
          <textarea
            className="flex-1 resize-none bg-transparent p-3 text-sm leading-snug outline-none"
            placeholder="Type a note…"
            value={note.text}
            onChange={(e) => update(note.id, { text: e.target.value })}
            onFocus={() => setEditing(true)}
            onBlur={() => setEditing(false)}
          />
        )}
      </div>
    </div>
  );
}
