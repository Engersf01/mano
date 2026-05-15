import { NextResponse } from "next/server";

export const runtime = "edge";

type Slide = {
  title?: string;
  body?: string;
  bullets?: string[];
  notes?: string;
  quote?: string;
};

type Payload = {
  message: string;
  slide?: Slide;
  coach?: { pace: number; fillerWords: number; sentiment: string };
  history?: { role: "user" | "assistant" | "system"; content: string }[];
};

const MODES = ["spatial", "classic", "brain", "globe", "timeline", "zoom"];

function localIntent(message: string, slide?: Slide, coach?: Payload["coach"]) {
  const m = message.toLowerCase();
  for (const mode of MODES) {
    if (m.includes(mode)) {
      return { intent: "set-mode", mode, reply: `Switching to ${mode} mode.` };
    }
  }
  if (/summari[sz]e|tl;?dr|short/.test(m)) {
    const text =
      slide?.bullets?.slice(0, 3).join(" · ") ??
      slide?.body ??
      slide?.quote ??
      slide?.title ??
      "This slide is the canvas — give it your own framing.";
    return { reply: `In short: ${text}` };
  }
  if (/coach|pace|filler|how am i/.test(m)) {
    const p = coach?.pace ?? 0;
    const f = coach?.fillerWords ?? 0;
    if (p > 175) return { reply: `You’re at ${Math.round(p)} wpm — slow down a touch. Breathe between bullets.` };
    if (p < 110 && p > 0) return { reply: `You’re around ${Math.round(p)} wpm — pick up a little energy.` };
    return { reply: `Pacing looks healthy. Filler count: ${f}. Keep eye contact on the camera.` };
  }
  if (/sticky|note/.test(m)) {
    return {
      reply: `Try: "Air-tap with the sticky tool to drop a note where your finger points."`,
    };
  }
  return {
    reply:
      "I can switch modes (say 'globe', 'brain', 'spatial', etc.), summarize the slide, or coach your pace. What would help right now?",
  };
}

async function openaiReply(payload: Payload, key: string) {
  const system = `You are Mano, an on-stage AI co-pilot for a spatial gesture-driven presentation tool.
Reply in <= 2 short sentences. You may set the scene mode by returning JSON like {"intent":"set-mode","mode":"brain"} as the FIRST line followed by the user-facing reply on subsequent lines.
Valid modes: ${MODES.join(", ")}.
Current slide JSON: ${JSON.stringify(payload.slide ?? {})}
Coach signals: ${JSON.stringify(payload.coach ?? {})}`;
  const body = {
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      { role: "system", content: system },
      ...(payload.history ?? []),
      { role: "user", content: payload.message },
    ],
  };
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`openai ${r.status}`);
  const json = await r.json();
  const text: string = json.choices?.[0]?.message?.content ?? "";
  const firstLine = text.split("\n")[0].trim();
  let intent: { intent?: string; mode?: string } = {};
  try {
    intent = JSON.parse(firstLine);
  } catch {
    intent = {};
  }
  return {
    intent: intent.intent,
    mode: intent.mode,
    reply: intent.intent ? text.split("\n").slice(1).join(" ").trim() || `Switching to ${intent.mode}.` : text,
  };
}

export async function POST(req: Request) {
  const payload = (await req.json()) as Payload;
  const key = process.env.OPENAI_API_KEY;
  try {
    if (key) {
      const out = await openaiReply(payload, key);
      return NextResponse.json(out);
    }
  } catch (err) {
    // fall through to local
  }
  return NextResponse.json(localIntent(payload.message, payload.slide, payload.coach));
}
