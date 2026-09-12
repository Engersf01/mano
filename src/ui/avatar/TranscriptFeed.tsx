"use client";
/** Rolling conversation log, newest at the bottom. */
import { useEffect, useRef } from "react";
import { Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TranscriptEntry } from "@/heygen/protocol";
import { Button, Panel } from "./primitives";

const ROLE_STYLE: Record<TranscriptEntry["role"], string> = {
  avatar: "border-aurora-cyan/25 bg-aurora-cyan/5 text-ink-50",
  user: "border-white/10 bg-white/[0.04] text-ink-100",
  system: "border-transparent bg-transparent text-ink-400 italic",
};

const ROLE_LABEL: Record<TranscriptEntry["role"], string> = {
  avatar: "Avatar",
  user: "Visitor",
  system: "System",
};

export function TranscriptFeed({
  entries,
  onClear,
}: {
  entries: TranscriptEntry[];
  onClear: () => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [entries.length]);

  return (
    <Panel
      title="Transcript"
      actions={
        entries.length > 0 ? (
          <Button className="px-2 py-1 text-[11px]" onClick={onClear}>
            <Eraser size={12} /> Clear
          </Button>
        ) : undefined
      }
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {entries.length === 0 ? (
          <p className="py-8 text-center text-xs text-ink-500">
            Nothing spoken yet. What the avatar says and hears lands here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={cn("rounded-xl border px-3 py-2 text-xs leading-relaxed", ROLE_STYLE[entry.role])}
              >
                <span className="mb-0.5 block text-[9px] uppercase tracking-[0.2em] opacity-60">
                  {ROLE_LABEL[entry.role]}
                </span>
                {entry.text}
              </li>
            ))}
          </ul>
        )}
        <div ref={endRef} />
      </div>
    </Panel>
  );
}
