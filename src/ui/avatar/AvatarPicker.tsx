"use client";
/** Searchable grid of streamable avatars. */
import { useMemo, useState } from "react";
import { Check, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AvatarSummary } from "@/heygen/types";
import { Panel, TextInput } from "./primitives";

type Props = {
  avatars: AvatarSummary[];
  selectedId: string;
  onSelect: (avatar: AvatarSummary) => void;
  loading?: boolean;
};

export function AvatarPicker({ avatars, selectedId, onSelect, loading }: Props) {
  const [query, setQuery] = useState("");
  /** Preview URLs that failed to load — fall back to the placeholder glyph. */
  const [broken, setBroken] = useState<Record<string, true>>({});

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return avatars;
    return avatars.filter((avatar) => avatar.name.toLowerCase().includes(needle));
  }, [avatars, query]);

  return (
    <Panel
      title="Avatar"
      subtitle={
        loading
          ? "Loading the avatar library…"
          : `${avatars.length} available — your own avatars first, then HeyGen's public library.`
      }
      actions={
        <div className="relative w-40">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="py-1.5 pl-7 text-xs"
          />
        </div>
      }
    >
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-xs text-ink-400">
          {loading ? "…" : "No avatars match that search."}
        </p>
      ) : (
        <ul className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
          {filtered.map((avatar) => {
            const selected = avatar.id === selectedId;
            return (
              <li key={avatar.id}>
                <button
                  type="button"
                  onClick={() => onSelect(avatar)}
                  title={avatar.name}
                  className={cn(
                    "group relative w-full overflow-hidden rounded-xl border text-left transition",
                    selected
                      ? "border-aurora-cyan/60 shadow-glow"
                      : "border-white/10 hover:border-white/25",
                  )}
                >
                  <div className="relative aspect-[3/4] w-full bg-ink-900">
                    {avatar.previewUrl && !broken[avatar.id] ? (
                      // Remote HeyGen CDN thumbnails — plain <img> avoids adding
                      // every possible avatar host to the next/image allowlist.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatar.previewUrl}
                        alt=""
                        loading="lazy"
                        onError={() => setBroken((current) => ({ ...current, [avatar.id]: true }))}
                        className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-ink-500">
                        <UserRound size={22} />
                      </span>
                    )}
                    {selected && (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-aurora-cyan text-ink-950">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                    {avatar.source === "user" && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.15em] text-aurora-violet backdrop-blur">
                        yours
                      </span>
                    )}
                  </div>
                  <div className="truncate bg-black/40 px-2 py-1.5 text-[11px] text-ink-100">
                    {avatar.name}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
