"use client";
/** Live framing controls for the panel — applied without restarting the session. */
import { cn } from "@/lib/utils";
import type { DisplayFit, DisplaySettings } from "@/heygen/protocol";
import { Field, Panel, Toggle } from "./primitives";

const BACKGROUNDS = ["#03040c", "#070815", "#0d1020", "#ffffff", "#00b140"];

export function StageSettings({
  settings,
  onChange,
}: {
  settings: DisplaySettings;
  onChange: (patch: Partial<DisplaySettings>) => void;
}) {
  return (
    <Panel title="Framing" subtitle="Applies to the panel immediately.">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-ink-900/50 p-1">
          {(["cover", "contain"] as DisplayFit[]).map((fit) => (
            <button
              key={fit}
              type="button"
              onClick={() => onChange({ fit })}
              className={cn(
                "rounded-lg px-2 py-1.5 text-xs capitalize transition",
                settings.fit === fit
                  ? "bg-aurora-cyan/15 text-aurora-cyan"
                  : "text-ink-300 hover:bg-white/5",
              )}
            >
              {fit === "cover" ? "Fill screen" : "Fit whole frame"}
            </button>
          ))}
        </div>

        <Field label={`Scale · ${settings.scale.toFixed(2)}×`}>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={settings.scale}
            onChange={(event) => onChange({ scale: Number(event.target.value) })}
            className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-aurora-cyan"
          />
        </Field>

        <Field label="Background" hint="Green works when the panel keys the avatar out.">
          <div className="flex items-center gap-1.5">
            {BACKGROUNDS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onChange({ background: color })}
                title={color}
                style={{ background: color }}
                className={cn(
                  "h-7 w-7 rounded-lg border transition",
                  settings.background === color
                    ? "border-aurora-cyan ring-2 ring-aurora-cyan/30"
                    : "border-white/15 hover:border-white/40",
                )}
              />
            ))}
            <input
              type="color"
              value={settings.background}
              onChange={(event) => onChange({ background: event.target.value })}
              className="h-7 w-9 cursor-pointer rounded-lg border border-white/15 bg-transparent"
              title="Custom color"
            />
          </div>
        </Field>

        <Toggle
          checked={settings.mirror}
          onChange={(mirror) => onChange({ mirror })}
          label="Mirror horizontally"
        />
        <Toggle
          checked={settings.showCaptions}
          onChange={(showCaptions) => onChange({ showCaptions })}
          label="Show captions on the panel"
        />
      </div>
    </Panel>
  );
}
