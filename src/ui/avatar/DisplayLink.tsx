"use client";
/**
 * How to get the panel pointed at this server: the LAN URLs to open in the
 * Android browser, plus the one caveat that bites (mic needs a secure origin).
 */
import { useCallback, useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Link2, MonitorSmartphone, TriangleAlert } from "lucide-react";
import { fetchDisplayUrl } from "@/heygen/client";
import type { DisplaySettings } from "@/heygen/protocol";
import { buildStandaloneUrl } from "@/heygen/standalone";
import type { SessionRequest } from "@/heygen/types";
import { Button, Panel, TextInput } from "./primitives";

type Props = {
  room: string;
  onRoomChange: (room: string) => void;
  /** Whether the operator is asking the panel to listen. */
  micWanted: boolean;
  displayPeers: number;
  /** Current session config, baked into the standalone link. */
  request: SessionRequest & { mic: boolean };
  settings: DisplaySettings;
};

export function DisplayLink({
  room,
  onRoomChange,
  micWanted,
  displayPeers,
  request,
  settings,
}: Props) {
  const [candidates, setCandidates] = useState<string[]>([]);
  const [origin, setOrigin] = useState("");
  const [path, setPath] = useState("/avatar/display");
  const [secure, setSecure] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDisplayUrl(room)
      .then((info) => {
        if (cancelled) return;
        setCandidates(info.candidates);
        setOrigin(info.origin);
        setPath(info.path);
        setSecure(info.secure);
      })
      .catch(() => {
        // Fall back to whatever this browser knows.
        if (!cancelled) setOrigin(window.location.origin);
      });
    return () => {
      cancelled = true;
    };
  }, [room]);

  const copy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }, []);

  const urls = candidates.length > 0 ? candidates : [`${origin}${path}`];
  // Prefer a LAN address for the panel; fall back to this browser's origin.
  const linkOrigin = candidates[0]
    ? new URL(candidates[0]).origin
    : origin || (typeof window === "undefined" ? "" : window.location.origin);
  const standaloneUrl = buildStandaloneUrl(linkOrigin, room, request, settings);

  return (
    <Panel
      title="Display"
      subtitle={
        displayPeers > 0
          ? `${displayPeers} panel${displayPeers === 1 ? "" : "s"} linked to this room.`
          : "Open one of these on the Android panel, then tap once to activate it."
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)]">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">Room</span>
            <TextInput
              value={room}
              onChange={(event) => onRoomChange(event.target.value)}
              placeholder="default"
              className="py-1.5 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
              Panel URL
            </span>
            <ul className="flex flex-col gap-1.5">
              {urls.map((url) => (
                <li key={url} className="flex items-center gap-1.5">
                  <code className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-ink-900/70 px-2.5 py-1.5 font-mono text-[11px] text-ink-100">
                    {url}
                  </code>
                  <Button
                    className="shrink-0 px-2 py-1.5"
                    title="Copy"
                    onClick={() => void copy(url)}
                  >
                    {copied === url ? (
                      <Check size={12} className="text-aurora-cyan" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/avatar/display?room=${encodeURIComponent(room)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-ink-100 transition hover:bg-white/10"
          >
            <MonitorSmartphone size={14} /> Open display window
            <ExternalLink size={11} className="opacity-50" />
          </a>
        </div>

        {/* A link that needs no console at all — the only thing that works when
            the app is deployed serverless, since the broker can't be shared. */}
        <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
            Standalone link
          </span>
          {request.avatarId ? (
            <>
              <div className="flex items-center gap-1.5">
                <code className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-ink-900/70 px-2.5 py-1.5 font-mono text-[11px] text-ink-100">
                  {standaloneUrl}
                </code>
                <Button
                  className="shrink-0 px-2 py-1.5"
                  title="Copy standalone link"
                  onClick={() => void copy(standaloneUrl)}
                >
                  {copied === standaloneUrl ? (
                    <Check size={12} className="text-aurora-cyan" />
                  ) : (
                    <Link2 size={12} />
                  )}
                </Button>
              </div>
              <span className="text-[11px] leading-relaxed text-ink-400">
                Carries the current avatar, voice and knowledge. The panel starts the session
                itself on the activation tap — no console, no control channel. Use this when the
                app is deployed rather than run on this machine.
              </span>
            </>
          ) : (
            <span className="text-[11px] text-ink-500">
              Pick an avatar to generate a link the panel can run on its own.
            </span>
          )}
        </div>

        {micWanted && !secure && (
          <p className="flex gap-2 rounded-xl border border-aurora-gold/25 bg-aurora-gold/10 px-3 py-2 text-[11px] leading-relaxed text-aurora-gold">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
            <span>
              You&rsquo;ve asked the panel to listen, but these URLs are plain{" "}
              <code className="font-mono">http://</code>. Browsers only grant microphone access
              in a secure context, so the avatar will speak but never hear. Serve Mano over HTTPS
              (a tunnel or a local certificate), or in Chrome on the panel add the origin to{" "}
              <code className="font-mono">
                chrome://flags/#unsafely-treat-insecure-origin-as-secure
              </code>
              .
            </span>
          </p>
        )}
      </div>
    </Panel>
  );
}
