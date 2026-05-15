"use client";
type SR = typeof window extends { SpeechRecognition: infer T } ? T : unknown;

export type SpeechHandle = {
  start: () => void;
  stop: () => void;
};

export function createSpeechRecognition(opts: {
  lang?: string;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (msg: string) => void;
}): SpeechHandle | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => any;
    webkitSpeechRecognition?: new () => any;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = opts.lang ?? "en-US";

  rec.onresult = (e: any) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) opts.onFinal(r[0].transcript);
      else interim += r[0].transcript;
    }
    if (interim) opts.onInterim(interim);
  };
  rec.onerror = (e: any) => opts.onError?.(e.error ?? "speech error");
  return {
    start: () => {
      try {
        rec.start();
      } catch {
        // already started
      }
    },
    stop: () => {
      try {
        rec.stop();
      } catch {
        // already stopped
      }
    },
  };
}
