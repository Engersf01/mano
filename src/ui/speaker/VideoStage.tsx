"use client";
/**
 * The thing everyone is here to watch, and the handoff into the actions below.
 *
 * Three cases, because the host will paste whichever link they have: a
 * YouTube or Vimeo URL (rendered as that platform's iframe), a direct video
 * file (rendered as a real `<video>`, which is the only case where progress
 * can be measured), or nothing at all — which says so plainly and points at
 * the console rather than showing a black rectangle.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Film, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Where "watched it" is remembered, so a reload doesn't re-nag. */
const WATCHED_KEY = "kn-speaker-watched";

/** Far enough in to count: credits and outros are not the content. */
const WATCHED_FRACTION = 0.8;

type Embed = { kind: "embed"; src: string } | { kind: "file"; src: string } | { kind: "none" };

/**
 * Turns whatever the host pasted into something renderable.
 *
 * Watch URLs, share URLs and already-embed URLs all show up in practice; the
 * first two render as a 404 inside an iframe, which looks like the app is
 * broken rather than the link being the wrong shape.
 */
export function resolveVideo(url: string): Embed {
  const trimmed = url.trim();
  if (!trimmed) return { kind: "none" };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { kind: "none" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return { kind: "none" };

  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    return id ? { kind: "embed", src: `https://www.youtube.com/embed/${id}` } : { kind: "none" };
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (parsed.pathname.startsWith("/embed/")) return { kind: "embed", src: parsed.toString() };
    const id = parsed.searchParams.get("v");
    return id ? { kind: "embed", src: `https://www.youtube.com/embed/${id}` } : { kind: "none" };
  }
  if (host === "vimeo.com") {
    // `/123456` and `/123456/abcdef` (unlisted links) both appear.
    const [id, hash] = parsed.pathname.split("/").filter(Boolean);
    if (!/^\d+$/.test(id ?? "")) return { kind: "none" };
    const query = hash ? `?h=${hash}` : "";
    return { kind: "embed", src: `https://player.vimeo.com/video/${id}${query}` };
  }
  if (host === "player.vimeo.com") return { kind: "embed", src: parsed.toString() };

  return { kind: "file", src: parsed.toString() };
}

export function VideoStage({
  url,
  poster,
  title,
  onWatched,
}: {
  url: string;
  poster: string;
  title: string;
  onWatched?: () => void;
}) {
  const video = resolveVideo(url);
  const [progress, setProgress] = useState(0);
  const [watched, setWatched] = useState(false);
  const announced = useRef(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(WATCHED_KEY) === "1") setWatched(true);
    } catch {
      // Private browsing just means the nudge shows again. Not worth handling.
    }
  }, []);

  const markWatched = useCallback(() => {
    setWatched(true);
    try {
      window.localStorage.setItem(WATCHED_KEY, "1");
    } catch {
      /* see above */
    }
    // Once per mount: `onTimeUpdate` fires several times a second, and the
    // parent uses this to scroll the actions into view.
    if (!announced.current) {
      announced.current = true;
      onWatched?.();
    }
  }, [onWatched]);

  const onTimeUpdate = useCallback(
    (event: React.SyntheticEvent<HTMLVideoElement>) => {
      const element = event.currentTarget;
      if (!element.duration || Number.isNaN(element.duration)) return;
      const fraction = element.currentTime / element.duration;
      setProgress(fraction);
      if (fraction >= WATCHED_FRACTION) markWatched();
    },
    [markWatched],
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-ink-900/60 shadow-glowViolet backdrop-blur">
      <div className="relative aspect-video w-full bg-black">
        {video.kind === "embed" && (
          <iframe
            src={video.src}
            title={title}
            className="absolute inset-0 h-full w-full"
            /* `fullscreen` is the one people notice missing on a phone. */
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}

        {video.kind === "file" && (
          <video
            src={video.src}
            poster={poster || undefined}
            controls
            playsInline
            preload="metadata"
            onTimeUpdate={onTimeUpdate}
            onEnded={markWatched}
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}

        {video.kind === "none" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <Film size={28} className="text-ink-400" />
            <p className="text-sm font-medium text-ink-100">The video isn&apos;t set yet</p>
            <p className="max-w-sm text-xs leading-relaxed text-ink-400">
              Paste a YouTube, Vimeo or direct video link in the host console and it
              appears here — everything below already works without it.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate font-display text-base font-medium text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-ink-400">
            {watched
              ? "Thanks for watching — pick an action below."
              : "Watch first, then choose an action below."}
          </p>
        </div>

        {/* Only a real <video> can be measured, so the file case gets a bar and
            the iframe case gets a plain prompt instead of a fake one. */}
        {video.kind === "file" && !watched && (
          <div className="flex items-center gap-2 sm:w-48">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-aurora-cyan transition-[width] duration-500"
                style={{ width: `${Math.round(Math.min(1, progress) * 100)}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-ink-400">
              {Math.round(Math.min(1, progress) * 100)}%
            </span>
          </div>
        )}

        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em]",
            watched ? "bg-aurora-cyan/15 text-aurora-cyan" : "bg-white/5 text-ink-300",
          )}
        >
          {watched ? <CheckCircle2 size={12} /> : <PlayCircle size={12} />}
          {watched ? "Watched" : "Not watched"}
        </span>
      </div>
    </div>
  );
}
