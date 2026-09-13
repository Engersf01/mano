"use client";
/** Persona + transport settings, and the start/stop switch for the session. */
import {
  Loader2,
  MonitorSmartphone,
  Play,
  RotateCcw,
  Square,
  SquareArrowOutUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DisplayStatus } from "@/heygen/protocol";
import {
  LANGUAGE_OPTIONS,
  QUALITY_OPTIONS,
  type ContextSummary,
  type Interactivity,
  type VideoQuality,
  type VoiceSummary,
} from "@/heygen/types";
import type { AvatarConfig, RenderTarget } from "@/store/avatar";
import { Button, ErrorNote, Field, Panel, Select, StatusPill, TextInput, Toggle } from "./primitives";

const STATUS_TONE: Record<DisplayStatus, string> = {
  offline: "idle",
  gated: "busy",
  idle: "idle",
  starting: "busy",
  live: "live",
  stopping: "busy",
  error: "bad",
};

const STATUS_LABEL: Record<DisplayStatus, string> = {
  offline: "no display",
  gated: "awaiting tap",
  idle: "standing by",
  starting: "connecting",
  live: "live",
  stopping: "stopping",
  error: "error",
};

type Props = {
  config: AvatarConfig;
  onConfig: (patch: Partial<AvatarConfig>) => void;
  voices: VoiceSummary[];
  contexts: ContextSummary[];
  target: RenderTarget;
  onTarget: (target: RenderTarget) => void;
  status: DisplayStatus;
  speaking: boolean;
  quality: string | null;
  error: string | null;
  busy: boolean;
  canStart: boolean;
  onStart: () => void;
  onStop: () => void;
  /** Drop this conversation and open a clean one for the next visitor. */
  onReset: () => void;
  /** `${...}` placeholders the selected context declares as required. */
  requiredVariables: string[];
  loadingVariables: boolean;
};

export function SessionControls({
  config,
  onConfig,
  voices,
  contexts,
  target,
  onTarget,
  status,
  speaking,
  quality,
  error,
  busy,
  canStart,
  onStart,
  onStop,
  onReset,
  requiredVariables,
  loadingVariables,
}: Props) {
  const live = status === "live" || status === "starting";
  const missing = requiredVariables.filter((name) => !config.dynamicVariables[name]?.trim());

  return (
    <Panel
      title="Session"
      actions={
        <div className="flex items-center gap-1.5">
          {quality && status === "live" && (
            <StatusPill tone="idle">{quality.toLowerCase()}</StatusPill>
          )}
          <StatusPill tone={STATUS_TONE[status]} pulse={status === "live" || status === "starting"}>
            {speaking && status === "live" ? "speaking" : STATUS_LABEL[status]}
          </StatusPill>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {/* Where the video lands. The panel is the point, but a preview here
            helps when you're setting the persona up at your desk. */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-ink-900/50 p-1">
          {(
            [
              { value: "device", label: "Android panel", Icon: MonitorSmartphone },
              { value: "here", label: "This window", Icon: SquareArrowOutUpRight },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              disabled={live}
              onClick={() => onTarget(value)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-50",
                target === value
                  ? "bg-aurora-cyan/15 text-aurora-cyan"
                  : "text-ink-300 hover:bg-white/5",
              )}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Voice" hint={config.voiceId ? undefined : "Falls back to the avatar's default."}>
            <Select
              value={config.voiceId}
              onChange={(event) => onConfig({ voiceId: event.target.value })}
            >
              <option value="">Avatar default</option>
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name}
                  {voice.language ? ` · ${voice.language}` : ""}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Knowledge context"
            hint={config.contextId ? undefined : "Without one the avatar won't answer questions."}
          >
            <Select
              value={config.contextId}
              onChange={(event) => onConfig({ contextId: event.target.value })}
            >
              <option value="">None (restricted)</option>
              {contexts.map((context) => (
                <option key={context.id} value={context.id}>
                  {context.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Language">
            <Select
              value={config.language}
              onChange={(event) => onConfig({ language: event.target.value })}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Video quality">
            <Select
              value={config.quality}
              onChange={(event) => onConfig({ quality: event.target.value as VideoQuality })}
            >
              {QUALITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Interaction">
            <Select
              value={config.interactivity}
              onChange={(event) =>
                onConfig({ interactivity: event.target.value as Interactivity })
              }
            >
              <option value="CONVERSATIONAL">Conversational</option>
              <option value="PUSH_TO_TALK">Push to talk</option>
            </Select>
          </Field>

          <Field label={`Voice speed · ${config.speed.toFixed(2)}×`}>
            <input
              type="range"
              min={0.8}
              max={1.2}
              step={0.05}
              value={config.speed}
              onChange={(event) => onConfig({ speed: Number(event.target.value) })}
              className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-aurora-cyan"
            />
          </Field>
        </div>

        {/* The API refuses a session that omits a variable its context requires,
            so these are inputs, not an afterthought. */}
        {requiredVariables.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl border border-aurora-violet/25 bg-aurora-violet/5 p-2.5">
            <span className="text-[10px] uppercase tracking-[0.2em] text-aurora-violet">
              Context variables
            </span>
            {requiredVariables.map((name) => (
              <label key={name} className="flex items-center gap-2">
                <code className="w-28 shrink-0 truncate font-mono text-[11px] text-ink-300">
                  {`\${${name}}`}
                </code>
                <TextInput
                  value={config.dynamicVariables[name] ?? ""}
                  placeholder="value"
                  className="py-1.5 text-xs"
                  onChange={(event) =>
                    onConfig({
                      dynamicVariables: {
                        ...config.dynamicVariables,
                        [name]: event.target.value,
                      },
                    })
                  }
                />
              </label>
            ))}
            <span className="text-[11px] leading-relaxed text-ink-400">
              This context requires {requiredVariables.length === 1 ? "this value" : "these values"};
              the session is rejected without {requiredVariables.length === 1 ? "it" : "them"}.
            </span>
          </div>
        )}

        <Toggle
          checked={config.mic}
          onChange={(mic) => onConfig({ mic })}
          label="Listen through the display's microphone"
        />

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex items-center gap-2">
          {live ? (
            <>
              {/* The reset is the one an operator reaches for most: a session
                  carries its whole history, so anything the avatar has got
                  wrong about the person in front of it only clears with a new
                  one. Ending the session leaves a dark panel instead. */}
              <Button
                variant="primary"
                onClick={onReset}
                disabled={busy || status !== "live"}
                className="flex-1"
              >
                <RotateCcw size={13} /> New conversation
              </Button>
              <Button variant="danger" onClick={onStop} disabled={busy}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Square size={13} />}
                End
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={onStart}
              disabled={!canStart || busy || missing.length > 0 || loadingVariables}
              className="flex-1"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Start session
            </Button>
          )}
        </div>

        {live && (
          <p className="text-[11px] text-ink-400">
            Restarts the greeting so the next visitor is met by name-free small talk. On the panel
            itself, press and hold anywhere for a second and a half to do the same.
          </p>
        )}

        {!config.avatarId && (
          <p className="text-[11px] text-ink-400">Choose an avatar to enable the session.</p>
        )}
        {missing.length > 0 && (
          <p className="text-[11px] text-aurora-gold">
            Fill in {missing.map((name) => `\${${name}}`).join(", ")} to start.
          </p>
        )}
        {target === "device" && status === "offline" && config.avatarId && (
          <p className="text-[11px] text-ink-400">
            No panel is linked yet — open the display URL on the Android screen and tap once.
          </p>
        )}
      </div>
    </Panel>
  );
}
