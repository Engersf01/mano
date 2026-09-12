"use client";
/** Push words to the avatar: through its LLM, or verbatim. */
import { useState } from "react";
import { CornerDownLeft, Hand, Mic, MicOff, MessageSquare, Quote, Square } from "lucide-react";
import type { SpeakMode } from "@/heygen/protocol";
import { Button, Panel, TextArea } from "./primitives";

type Props = {
  disabled: boolean;
  micOn: boolean;
  micDisabled: boolean;
  pushToTalk: boolean;
  onSpeak: (text: string, mode: SpeakMode) => void;
  onInterrupt: () => void;
  onMic: (on: boolean) => void;
  onPushToTalk: (on: boolean) => void;
};

export function SpeakConsole({
  disabled,
  micOn,
  micDisabled,
  pushToTalk,
  onSpeak,
  onInterrupt,
  onMic,
  onPushToTalk,
}: Props) {
  const [text, setText] = useState("");

  const send = (mode: SpeakMode) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSpeak(trimmed, mode);
    setText("");
  };

  return (
    <Panel
      title="Say something"
      subtitle="Talk routes through the avatar's knowledge; Repeat speaks your words exactly."
    >
      <div className="flex flex-col gap-2.5">
        <TextArea
          value={text}
          rows={3}
          disabled={disabled}
          placeholder={
            disabled ? "Start a session to speak." : "Type a question or a line to deliver…"
          }
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // ⌘/Ctrl+Enter answers through the LLM; Shift+Enter keeps a newline.
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              send("talk");
            }
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" disabled={disabled || !text.trim()} onClick={() => send("talk")}>
            <MessageSquare size={14} /> Talk
            <CornerDownLeft size={11} className="opacity-50" />
          </Button>
          <Button disabled={disabled || !text.trim()} onClick={() => send("repeat")}>
            <Quote size={14} /> Repeat
          </Button>
          <Button variant="danger" disabled={disabled} onClick={onInterrupt}>
            <Square size={13} /> Interrupt
          </Button>

          <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />

          <Button
            disabled={disabled || micDisabled}
            onClick={() => onMic(!micOn)}
            className={micOn ? "border-aurora-cyan/40 text-aurora-cyan" : undefined}
            title={micDisabled ? "The display can't capture audio" : "Toggle the display's mic"}
          >
            {micOn ? <Mic size={14} /> : <MicOff size={14} />}
            {micOn ? "Mic live" : "Mic off"}
          </Button>

          {pushToTalk && (
            <Button
              disabled={disabled || micDisabled}
              onPointerDown={() => onPushToTalk(true)}
              onPointerUp={() => onPushToTalk(false)}
              onPointerLeave={() => onPushToTalk(false)}
              title="Hold to let the visitor speak"
            >
              <Hand size={14} /> Hold to talk
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}
