"use client";
/**
 * The thing everyone is here to watch, behind one play click.
 *
 * Three cases, because the host pastes whichever link they have: a YouTube or
 * Vimeo URL (that platform's iframe), a direct video file (a real `<video>`),
 * or nothing at all — which says so plainly and points at the console rather
 * than showing a black rectangle.
 *
 * The play click is the page's own, not the player's, for both cases. That is
 * what makes the countdown honest: an iframe gives no signal when someone
 * presses play inside it, so covering it until the viewer commits is the only
 * way the timer starts when they actually start watching.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Film, Play, Timer, VideoOff } from "lucide-react";
import { VIDEO_COUNTDOWN_SECONDS } from "@/speaker/config";
import { cn } from "@/lib/utils";

/** Where "watched it" is remembered, so a reload doesn't re-nag. */
const WATCHED_KEY = "neumomeet-watched";

type Embed =
  | { kind: "embed"; src: string }
  | { kind: "file"; src: string }
  | { kind: "none" };

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

  /**
   * A root-relative path is a file this deployment serves itself, out of
   * `public/`. Worth supporting as its own case: it is the only arrangement
   * where the countdown can follow real playback, because a same-origin
   * `<video>` reports its own `currentTime` and a pause with it.
   *
   * `//host/path` is protocol-relative and points off-site, so it is not a
   * local path however much it looks like one.
   */
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return { kind: "file", src: trimmed };
  }

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

  /**
   * Google Drive. The link its share dialog hands out ends in `/view`, which
   * is a page, not a video — dropped into a `<video>` it plays nothing and
   * into an iframe it renders Drive's whole UI. `/preview` is the player.
   *
   * The file has to be shared with "anyone with the link"; a restricted file
   * renders a Google sign-in page inside the frame, which looks like this app
   * is broken rather than the file being private.
   */
  if (host === "drive.google.com") {
    const id =
      /\/file\/d\/([^/]+)/.exec(parsed.pathname)?.[1] ?? parsed.searchParams.get("id");
    return id
      ? { kind: "embed", src: `https://drive.google.com/file/d/${id}/preview` }
      : { kind: "none" };
  }

  return { kind: "file", src: parsed.toString() };
}

/**
 * Adds autoplay without trampling a link's existing parameters, such as
 * Vimeo's `h=` hash for an unlisted video.
 *
 * Drive's preview player takes no autoplay parameter, so it is left alone —
 * adding one would put a query string on the URL that does nothing, and the
 * viewer presses play inside the frame as its own second step.
 */
function withAutoplay(src: string) {
  try {
    const url = new URL(src);
    if (url.hostname === "drive.google.com") return src;
    url.searchParams.set("autoplay", "1");
    return url.toString();
  } catch {
    return src;
  }
}

const mmss = (seconds: number) => {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${(whole % 60).toString().padStart(2, "0")}`;
};

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
  const [started, setStarted] = useState(false);
  const [remaining, setRemaining] = useState(VIDEO_COUNTDOWN_SECONDS);
  const [watched, setWatched] = useState(false);
  /**
   * The file was served but will not play — a codec the browser lacks, a
   * truncated transfer, a dead link.
   *
   * Without this the page is a trap: a stalled player above a countdown that
   * can never advance, because the clock is driven by `timeupdate` events a
   * broken video never fires. Nobody reaches the actions, which are the entire
   * point of the page. So the failure is stated, and the actions are released
   * anyway — the video is an introduction, not a gate.
   */
  const [failed, setFailed] = useState(false);
  const element = useRef<HTMLVideoElement | null>(null);
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
    // Once per mount: the countdown and `onEnded` can both land here, and the
    // parent uses this to scroll the actions into view.
    if (!announced.current) {
      announced.current = true;
      onWatched?.();
    }
  }, [onWatched]);

  /**
   * The embed's clock.
   *
   * Wall time, and it cannot be better than that: a cross-origin iframe never
   * tells us that the viewer paused. A file-backed video is driven from its
   * own `currentTime` instead (see `onTimeUpdate`), which does survive a
   * pause, so this effect deliberately does not run for that case.
   */
  useEffect(() => {
    if (!started || video.kind !== "embed" || remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((left) => {
        const next = left - 1;
        if (next <= 0) markWatched();
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, video.kind, remaining, markWatched]);

  const start = useCallback(() => {
    setStarted(true);
    // A file plays from the same gesture, so no autoplay policy is involved.
    // `play()` rejects if the browser declines; the countdown still runs off
    // playback time, so a refusal shows a paused player rather than a timer
    // racing ahead of a video nobody is watching.
    void element.current?.play().catch(() => {});
  }, []);

  const onFailure = useCallback(() => {
    setFailed(true);
    /**
     * Only move the page if they had actually pressed play.
     *
     * `preload="metadata"` means the browser tries to decode before anyone
     * touches anything, so this can fire on load — and scrolling someone's
     * page out from under them on arrival, because a video they never asked
     * for could not start, is worse than the failure it is reacting to.
     *
     * Deliberately not `markWatched` either way: they did not watch it, and
     * recording otherwise would hide the problem from the host's own page.
     */
    if (started) onWatched?.();
  }, [started, onWatched]);

  const onTimeUpdate = useCallback(
    (event: React.SyntheticEvent<HTMLVideoElement>) => {
      const left = VIDEO_COUNTDOWN_SECONDS - event.currentTarget.currentTime;
      setRemaining(Math.max(0, left));
      if (left <= 0) markWatched();
    },
    [markWatched],
  );

  const showCountdown = started && video.kind !== "none";
  const elapsed = VIDEO_COUNTDOWN_SECONDS - remaining;
  const fraction = Math.min(1, Math.max(0, elapsed / VIDEO_COUNTDOWN_SECONDS));

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
      {/*
        The countdown sits above the frame rather than over the picture: on a
        phone the video is most of the screen, and a floating pill would land
        on top of whatever the video is showing — or under the player's own
        controls, which is where every platform puts its chrome.
      */}
      <div
        className={cn(
          "flex items-center gap-3 border-b px-4 py-3 transition-colors",
          remaining <= 0 && started
            ? "border-cyan-200 bg-cyan-50"
            : "border-slate-200 bg-slate-50",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-bold tabular-nums ring-1",
            failed
              ? "bg-slate-100 text-slate-400 ring-slate-200"
              : !showCountdown
                ? "bg-white text-slate-600 ring-slate-200"
                : remaining <= 0
                  ? "bg-cyan-700 text-white ring-cyan-700"
                  : remaining <= 10
                    ? "bg-amber-50 text-amber-800 ring-amber-300"
                    : "bg-white text-slate-900 ring-slate-300",
          )}
        >
          {remaining <= 0 && started ? <CheckCircle2 size={15} /> : <Timer size={15} />}
          {/* `aria-live` on a per-second counter would read every tick aloud,
              so the region is polite and the label carries the meaning. */}
          <span aria-hidden>{mmss(showCountdown ? remaining : VIDEO_COUNTDOWN_SECONDS)}</span>
          <span className="sr-only">
            {showCountdown
              ? `Quedan ${Math.ceil(remaining)} segundo${Math.ceil(remaining) === 1 ? "" : "s"} de video`
              : `Video de ${VIDEO_COUNTDOWN_SECONDS} segundos`}
          </span>
        </span>

        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700 ease-linear",
              remaining <= 0 && started ? "bg-cyan-700" : "bg-cyan-600",
            )}
            style={{ width: `${showCountdown ? Math.round(fraction * 100) : 0}%` }}
          />
        </div>

        <span className="hidden shrink-0 text-[11px] font-medium text-slate-500 sm:inline">
          {failed
            ? "Sigue abajo"
            : !started
              ? "Pulsa reproducir para empezar"
              : remaining <= 0
                ? "Listo — elige una acción abajo"
                : "Reproduciendo"}
        </span>
      </div>

      <div className="relative aspect-video w-full bg-slate-900">
        {video.kind === "embed" && started && (
          <iframe
            src={withAutoplay(video.src)}
            title={title}
            className="absolute inset-0 h-full w-full"
            /* `autoplay` so the play click carries into the frame, and
               `fullscreen` because it is the one people notice missing. */
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}

        {video.kind === "file" && (
          <video
            ref={element}
            src={video.src}
            poster={poster || undefined}
            controls={started}
            playsInline
            preload="metadata"
            onTimeUpdate={onTimeUpdate}
            onEnded={markWatched}
            onError={onFailure}
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}

        {/* The cover. Stays up for an embed until play, and for a file too, so
            the countdown has a single well-defined moment to start from — but
            never over a player that has already failed. */}
        {video.kind !== "none" && !started && !failed && (
          <button
            type="button"
            onClick={start}
            aria-label={`Reproducir el video de ${VIDEO_COUNTDOWN_SECONDS} segundos`}
            className="group absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/55 backdrop-blur-[2px] transition hover:bg-slate-900/45"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-xl transition group-hover:scale-105">
              <Play size={24} className="ml-1 fill-cyan-700 text-cyan-700" />
            </span>
            <span className="px-6 text-center text-sm font-medium text-white">
              Reproducir — {VIDEO_COUNTDOWN_SECONDS} segundos
            </span>
          </button>
        )}

        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 px-6 text-center">
            <VideoOff size={26} className="text-slate-400" />
            <p className="text-sm font-medium text-slate-700">
              El video no se pudo reproducir
            </p>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500">
              Puede ser tu conexión o el navegador. No hace falta para nada de lo de
              abajo — sigue y elige una acción.
            </p>
          </div>
        )}

        {video.kind === "none" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 px-6 text-center">
            <Film size={28} className="text-slate-400" />
            <p className="text-sm font-medium text-slate-700">
              El video aún no está configurado
            </p>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500">
              Pega un enlace de YouTube, Vimeo o de un video directo en la consola del
              anfitrión y aparecerá aquí — todo lo de abajo ya funciona sin él.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate font-display text-base font-semibold text-slate-900">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {failed
              ? "El video no cargó, pero las tres acciones de abajo funcionan igual."
              : watched
                ? "Gracias por verlo — elige una acción abajo."
                : `${VIDEO_COUNTDOWN_SECONDS} segundos, y luego elige una de las tres acciones de abajo.`}
          </p>
        </div>

        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ring-1",
            watched
              ? "bg-cyan-50 text-cyan-800 ring-cyan-200"
              : "bg-slate-100 text-slate-600 ring-slate-200",
          )}
        >
          {watched ? <CheckCircle2 size={12} /> : <Timer size={12} />}
          {watched ? "Visto" : "Sin ver"}
        </span>
      </div>
    </div>
  );
}
