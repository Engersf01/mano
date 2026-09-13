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
import { Delete, Loader2, LockKeyhole, TriangleAlert } from "lucide-react";
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
  /**
   * Index of the digit to show in the clear.
   *
   * Masking every digit the instant it lands is what made this hard to use on
   * the real panel: with nothing but identical dots there is no way to tell a
   * mis-tap from a missed tap. Showing the last one briefly, the way a phone
   * lock screen does, gives that back without putting the PIN on display in
   * front of a room.
   */
  const [revealed, setRevealed] = useState(-1);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  /**
   * The lengths of the configured PINs, so the pad can open on the last digit
   * rather than asking for a submit key. Empty until the check comes back.
   */
  const [lengths, setLengths] = useState<number[]>([]);
  /**
   * What the server says about its own setup: null while asking, then whether
   * any PINs exist at all.
   *
   * Kept apart from `error` on purpose. A standing condition — no PINs
   * configured, two PINs colliding — must not be wiped by the next keypress
   * the way a wrong-PIN message should be. It was, and the result was a panel
   * that explained itself for exactly as long as nobody touched it.
   */
  const [setup, setSetup] = useState<{ configured: boolean; warning?: string } | null>(null);
  /** Lengths already tried for the current entry, so one try is one request. */
  const triedRef = useRef(new Set<number>());
  /**
   * Keeps keystrokes in the page. Without something focusable here, a panel's
   * keyboard drives the browser's address bar instead: the digits edit the URL
   * and Enter reloads the page, which looks exactly like the PIN pad refusing
   * to do anything. `inputMode="none"` stops a touch keyboard covering the pad
   * while still letting a real one through.
   */
  const keyCatcher = useRef<HTMLInputElement | null>(null);
  const holdFocus = useCallback(() => keyCatcher.current?.focus(), []);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(REMEMBERED);
      if (saved) setPreset(JSON.parse(saved) as ResolvedPreset);
    } catch {
      // a corrupt or unavailable store just means typing the PIN again
    }
  }, []);

  // Say "no PINs are set up" before someone types one, not after.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/avatar/preset")
      .then(
        (response) =>
          response.json() as Promise<{
            configured: boolean;
            lengths: number[];
            warning?: string;
          }>,
      )
      .then((data) => {
        if (cancelled) return;
        setLengths(data.lengths ?? []);
        setSetup({ configured: Boolean(data.configured), warning: data.warning });
      })
      .catch(() => {
        if (cancelled) return;
        setSetup({ configured: false, warning: "Could not reach the server." });
        setError("Could not reach the server. Check the panel's connection.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = useCallback(async (candidate: string, automatic = false) => {
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
        setShake(true);
        setTimeout(() => setShake(false), 500);
        // An automatic try keeps the digits: with PINs of more than one length,
        // a six-digit PIN passes through four digits on its way in, and wiping
        // it there would make longer PINs impossible to type.
        if (!automatic) {
          setPin("");
          triedRef.current.clear();
        }
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
      if (revealTimer.current) clearTimeout(revealTimer.current);
      if (key === "back") {
        setRevealed(-1);
        triedRef.current.clear();
        return setPin((current) => current.slice(0, -1));
      }
      if (key === "clear") {
        setRevealed(-1);
        triedRef.current.clear();
        return setPin("");
      }
      setPin((current) => {
        const next = (current + key).slice(0, MAX_PIN_LENGTH);
        setRevealed(next.length - 1);
        revealTimer.current = setTimeout(() => setRevealed(-1), 800);
        return next;
      });
    },
    [],
  );

  useEffect(() => () => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
  }, []);

  /**
   * Open as soon as the entry is as long as a real PIN. Nobody should have to
   * find a submit key on a panel, and on this hardware the keyboard may not be
   * reaching the page at all — the last digit is the natural moment to try.
   */
  useEffect(() => {
    if (preset || busy) return;
    // With no lengths known — the setup check failed — fall back to trying at
    // the maximum. Silence is the one outcome this must never produce.
    const targets = lengths.length > 0 ? lengths : [MAX_PIN_LENGTH];
    if (!targets.includes(pin.length)) return;
    if (triedRef.current.has(pin.length)) return;
    triedRef.current.add(pin.length);
    void submit(pin, true);
  }, [busy, lengths, pin, preset, submit]);

  // A keyboard, for whoever has one attached to the panel.
  useEffect(() => {
    if (preset) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key >= "0" && event.key <= "9") press(event.key);
      else if (event.key === "Backspace") press("back");
      else if (event.key === "Escape") press("clear");
      else if (event.key === "Enter") {
        // Whatever else has focus, Enter on this page is ours — otherwise the
        // browser treats it as "go" and reloads.
        event.preventDefault();
        if (pin.length >= MIN_PIN_LENGTH) void submit(pin);
        else setError(`A PIN is at least ${MIN_PIN_LENGTH} digits.`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pin, preset, press, submit]);

  if (preset) return <DisplayClient preset={preset} />;

  /**
   * No PINs exist, so no PIN can work. Showing a keypad here is a lie: it
   * looks like the panel is refusing the digits when nothing was ever going
   * to open. Say what is wrong and exactly what fixes it instead.
   */
  if (setup && !setup.configured) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-ink-950 p-5">
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl border border-aurora-gold/30 bg-aurora-gold/5 p-5 text-left">
          <div className="flex items-center gap-2 text-aurora-gold">
            <TriangleAlert size={16} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Not set up yet
            </span>
          </div>
          <p className="text-sm leading-relaxed text-ink-100">
            This panel has no PINs, so nothing can open it. Add an environment
            variable to the deployment:
          </p>
          <code className="block rounded-xl bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-aurora-cyan">
            AVATAR_PINS
            <br />
            482199:natalie, 731044:natalie-en
          </code>
          <p className="text-xs leading-relaxed text-ink-300">
            In Vercel: <strong className="text-ink-100">Settings → Environment Variables</strong>,
            then <strong className="text-ink-100">redeploy</strong> — an existing deployment does
            not pick up a new variable on its own.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-1 h-11 rounded-xl border border-white/15 bg-white/5 text-sm text-ink-100 active:scale-95"
          >
            Check again
          </button>
        </div>
      </main>
    );
  }

  const ready = pin.length >= MIN_PIN_LENGTH;

  return (
    <main
      className="flex h-screen w-screen select-none items-center justify-center bg-ink-950 p-4"
      onPointerDown={holdFocus}
    >
      {/* Pulls keyboard focus into the page. Not hidden with display:none —
          that cannot hold focus — but parked off-screen and silent. */}
      <input
        ref={keyCatcher}
        autoFocus
        inputMode="none"
        aria-hidden
        tabIndex={-1}
        onBlur={holdFocus}
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
      {/* One bordered card rather than elements spread down a tall panel: at a
          stand you are looking at it from a step away, and a group the eye can
          take in at once beats a column it has to travel. */}
      <div className="flex w-full max-w-[17rem] flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-5">
        <div className="flex items-center gap-2 text-ink-300">
          {busy ? (
            <Loader2 size={14} className="animate-spin text-aurora-cyan" />
          ) : (
            <LockKeyhole size={14} className="text-aurora-cyan" />
          )}
          <span className="text-xs uppercase tracking-[0.2em]">
            {busy ? "Checking" : "Enter the PIN"}
          </span>
        </div>

        {setup?.warning && (
          <p className="rounded-xl border border-aurora-gold/30 bg-aurora-gold/10 px-3 py-2 text-[11px] leading-relaxed text-aurora-gold">
            {setup.warning}
          </p>
        )}

        {/* Boxes, not loose dots — the count is readable at a glance, and the
            digit just pressed shows before it masks. */}
        <div
          className={`flex items-center gap-2 ${shake ? "animate-[shake_0.45s_ease-in-out]" : ""}`}
        >
          {Array.from({ length: Math.max(MIN_PIN_LENGTH, pin.length) }).map((_, index) => (
            <span
              key={index}
              className={`flex h-11 w-9 items-center justify-center rounded-lg border text-xl font-medium transition ${
                index < pin.length
                  ? "border-aurora-cyan bg-aurora-cyan/25 text-white"
                  : "border-white/15 bg-transparent text-transparent"
              }`}
            >
              {/* Filled has to be unmistakable from a step away: a low-contrast
                  dot on a low-contrast box is exactly what made this unreadable
                  on the panel. */}
              {index === revealed ? pin[index] : index < pin.length ? "●" : ""}
            </span>
          ))}
        </div>

        <div className="grid w-full grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              disabled={busy}
              onClick={() => press(key)}
              className="flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl font-light text-white transition active:scale-95 active:bg-aurora-cyan/20 disabled:opacity-40"
            >
              {key === "back" ? (
                <Delete size={17} />
              ) : key === "clear" ? (
                <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">clr</span>
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
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition active:scale-95 ${
            ready && !busy
              ? "border-aurora-cyan bg-aurora-cyan/25 text-white"
              : "border-white/10 bg-white/5 text-ink-500"
          }`}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : null}
          Open
        </button>

        {lengths.length > 0 && (
          <p className="text-center text-[10px] leading-relaxed text-ink-500">
            Opens on the last digit — no need to press anything else.
          </p>
        )}

        {error && (
          <p className="w-full text-balance rounded-xl border border-aurora-pink/30 bg-aurora-pink/10 px-3 py-2 text-center text-xs leading-relaxed text-aurora-pink">
            {error}
          </p>
        )}
      </div>

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
