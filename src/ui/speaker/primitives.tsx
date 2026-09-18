"use client";
/**
 * Light-theme chrome for the speaker hub.
 *
 * A deliberate parallel to `src/ui/avatar/primitives.tsx` rather than a shared
 * themed set. Those are for the kiosk: dark glass panels on a black stage, on
 * a panel bolted to a stand. This is a public web page on white, read on a
 * phone in daylight — the two have opposite contrast requirements, and
 * threading a theme flag through the kiosk's controls to serve a marketing
 * page is how a presentation stage ends up washed out at a conference.
 *
 * Tailwind's default `slate` / `cyan` / `violet` ramps carry it; the project's
 * own `ink` and `aurora` scales are tuned for the dark stage and read as
 * washed-out pastels on white.
 */
import { cn } from "@/lib/utils";

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
        className,
      )}
    >
      {(title || actions) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      {children}
      {hint && <span className="text-[11px] leading-snug text-slate-500">{hint}</span>}
    </label>
  );
}

/**
 * 16px on the input itself, not 14.
 *
 * iOS Safari zooms the whole page when a focused field's text is under 16px,
 * and this form is mostly filled in on a phone. The label and hint stay small;
 * the thing being typed into does not.
 */
const CONTROL =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 sm:text-sm";

export function TextInput({ className, ...props }: React.ComponentProps<"input">) {
  return <input {...props} className={cn(CONTROL, className)} />;
}

export function TextArea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(CONTROL, "resize-y leading-relaxed", className)} />;
}

type ButtonVariant = "primary" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-cyan-700 text-white shadow-sm hover:bg-cyan-800 focus-visible:outline-cyan-700",
  ghost:
    "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-slate-400",
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:outline-rose-500",
};

export function Button({
  variant = "ghost",
  className,
  ...props
}: React.ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition",
          checked ? "bg-cyan-700" : "bg-slate-300",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

const TONE: Record<string, string> = {
  good: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  busy: "bg-amber-50 text-amber-800 ring-amber-200",
  bad: "bg-rose-50 text-rose-700 ring-rose-200",
  idle: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function StatusPill({
  tone = "idle",
  children,
}: {
  tone?: keyof typeof TONE | string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ring-1",
        TONE[tone] ?? TONE.idle,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      // Announced rather than silently appearing: a rejected booking is the
      // one message on this page a screen reader must not miss.
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-800"
    >
      {children}
    </p>
  );
}

/** The soft wash behind every hub page — white first, colour barely there. */
export function PageBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-white">
      <div className="absolute inset-x-0 top-0 h-[32rem] bg-gradient-to-b from-cyan-50/70 via-white to-white" />
      <div className="absolute inset-0 opacity-[0.55] [background-image:radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:28px_28px]" />
    </div>
  );
}
