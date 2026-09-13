"use client";
/**
 * The panel's front door: one short URL, and a PIN that picks what opens.
 *
 * Built for the hardware it runs on — a monitor you tap with a finger while
 * standing up, whose on-screen keyboard is the reason the long links had to
 * go. So: large targets, no text field to focus, and a physical keyboard works
 * too for whoever has one plugged in.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Delete, Loader2, LockKeyhole } from "lucide-react";
import { MAX_PIN_LENGTH, MIN_PIN_LENGTH, type ResolvedPreset } from "@/avatar/presets";

const DisplayClient = dynamic(() => import("../avatar/display/DisplayClient"), {
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-ink-950" />,
});

/**
 * Survives a reload so an accidental refresh mid-conference doesn't send
 * someone hunting for the PIN again. Session storage, not local: it clears
 * when the browser session ends, which is the behaviour a shared panel wants.
 */
const REMEMBERED = "mano-avatar-preset";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

export default function PinPad() {
  const [preset, setPreset] = useState<ResolvedPreset | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(REMEMBERED);
      if (saved) setPreset(JSON.parse(saved) as ResolvedPreset);
    } catch {
      // a corrupt or unavailable store just means typing the PIN again
    }
  }, []);

  const submit = useCallback(async (candidate: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/avatar/preset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: candidate }),
      });
      const data = (await response.json()) as { preset?: ResolvedPreset; error?: string };
      if (!response.ok || !data.preset) {
        setError(data.error ?? "That PIN doesn't open anything.");
        setPin("");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
      try {
        window.sessionStorage.setItem(REMEMBERED, JSON.stringify(data.preset));
      } catch {
        // not being able to remember it is not a reason to refuse to open it
      }
      setPreset(data.preset);
    } catch {
      setError("Could not reach the server. Check the panel's connection.");
      setPin("");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const press = useCallback(
    (key: string) => {
      setError(null);
      if (key === "back") return setPin((current) => current.slice(0, -1));
      if (key === "clear") return setPin("");
      setPin((current) => {
        const next = (current + key).slice(0, MAX_PIN_LENGTH);
        return next;
      });
    },
    [],
  );

  // A keyboard, for whoever has one attached to the panel.
  useEffect(() => {
    if (preset) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key >= "0" && event.key <= "9") press(event.key);
      else if (event.key === "Backspace") press("back");
      else if (event.key === "Escape") press("clear");
      else if (event.key === "Enter" && pin.length >= MIN_PIN_LENGTH) void submit(pin);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pin, preset, press, submit]);

  if (preset) return <DisplayClient preset={preset} />;

  const ready = pin.length >= MIN_PIN_LENGTH;

  return (
    <main className="flex h-screen w-screen select-none flex-col items-center justify-center gap-7 bg-ink-950 px-6">
      <div className="flex flex-col items-center gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-aurora-cyan/15 text-aurora-cyan">
          <LockKeyhole size={20} />
        </span>
        <span className="font-display text-xl tracking-tight text-white">Avatar panel</span>
        <span className="text-xs text-ink-400">Enter the PIN for this activity</span>
      </div>

      {/* Dots rather than digits: the PIN gets typed in front of visitors. */}
      <div
        className={`flex items-center gap-3 ${shake ? "animate-[shake_0.45s_ease-in-out]" : ""}`}
        style={{ minHeight: "1.25rem" }}
      >
        {Array.from({ length: Math.max(MIN_PIN_LENGTH, pin.length) }).map((_, index) => (
          <span
            key={index}
            className={`h-3 w-3 rounded-full transition ${
              index < pin.length ? "bg-aurora-cyan" : "bg-white/15"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={busy}
            onClick={() => press(key)}
            className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl font-light text-white transition active:scale-95 active:bg-aurora-cyan/20 disabled:opacity-40"
          >
            {key === "back" ? (
              <Delete size={20} />
            ) : key === "clear" ? (
              <span className="text-xs uppercase tracking-[0.2em] text-ink-400">clr</span>
            ) : (
              key
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!ready || busy}
        onClick={() => void submit(pin)}
        className="flex h-12 w-[14.5rem] items-center justify-center gap-2 rounded-2xl border border-aurora-cyan/30 bg-aurora-cyan/15 text-sm font-medium text-aurora-cyan transition active:scale-95 disabled:opacity-30"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : null}
        Open
      </button>

      {error && (
        <p className="max-w-sm text-balance text-center text-xs leading-relaxed text-aurora-pink">
          {error}
        </p>
      )}

      <style>{`@keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-7px); }
        40% { transform: translateX(7px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
      }`}</style>
    </main>
  );
}
