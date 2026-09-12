"use client";
/** Small shared chrome for the avatar console, in Mano's glass-panel idiom. */
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
        "rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-inset1 backdrop-blur",
        className,
      )}
    >
      {(title || actions) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-[11px] font-medium uppercase tracking-[0.25em] text-ink-200">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-1 text-xs text-ink-400">{subtitle}</p>}
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
      <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">{label}</span>
      {children}
      {hint && <span className="text-[11px] leading-snug text-ink-400">{hint}</span>}
    </label>
  );
}

const CONTROL =
  "w-full rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2 text-sm text-ink-50 outline-none transition placeholder:text-ink-500 focus:border-aurora-cyan/50 focus:ring-1 focus:ring-aurora-cyan/30 disabled:opacity-50";

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select {...props} className={cn(CONTROL, "appearance-none pr-8", className)} />;
}

export function TextInput({ className, ...props }: React.ComponentProps<"input">) {
  return <input {...props} className={cn(CONTROL, className)} />;
}

export function TextArea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(CONTROL, "resize-y leading-relaxed", className)} />;
}

type ButtonVariant = "primary" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-aurora-cyan/15 text-aurora-cyan hover:bg-aurora-cyan/25 border-aurora-cyan/30",
  ghost: "bg-white/5 text-ink-100 hover:bg-white/10 border-white/10",
  danger: "bg-aurora-pink/10 text-aurora-pink hover:bg-aurora-pink/20 border-aurora-pink/30",
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
        "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
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
      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900/70 px-3 py-2 text-sm text-ink-100 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-4 w-8 shrink-0 rounded-full transition",
          checked ? "bg-aurora-cyan/70" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

const TONE: Record<string, string> = {
  live: "bg-aurora-cyan/15 text-aurora-cyan",
  busy: "bg-aurora-gold/15 text-aurora-gold",
  bad: "bg-aurora-pink/15 text-aurora-pink",
  idle: "bg-white/5 text-ink-300",
};

export function StatusPill({
  tone = "idle",
  children,
  pulse,
}: {
  tone?: keyof typeof TONE | string;
  children: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em]",
        TONE[tone] ?? TONE.idle,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current",
          pulse && "animate-pulseGlow",
        )}
      />
      {children}
    </span>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-aurora-pink/25 bg-aurora-pink/10 px-3 py-2 text-xs leading-relaxed text-aurora-pink">
      {children}
    </p>
  );
}
