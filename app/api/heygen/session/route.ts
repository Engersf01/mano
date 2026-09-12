import { NextResponse } from "next/server";
import { errorResponse, liveAvatar } from "@/heygen/api";
import type { Interactivity, SessionRequest, VideoQuality } from "@/heygen/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUALITIES: VideoQuality[] = ["low", "medium", "high", "very_high"];
const INTERACTIVITY: Interactivity[] = ["CONVERSATIONAL", "PUSH_TO_TALK"];

type TokenResponse = { session_id?: string; session_token?: string };

/**
 * Mint a LiveAvatar session token.
 *
 * The avatar, voice, language and context are all bound to the token here on
 * the server — the browser SDK only ever receives the short-lived token, never
 * the API key, and cannot swap in a different avatar or context.
 */
export async function POST(req: Request) {
  let body: Partial<SessionRequest>;
  try {
    body = (await req.json()) as Partial<SessionRequest>;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const avatarId = typeof body.avatarId === "string" ? body.avatarId.trim() : "";
  if (!avatarId) return NextResponse.json({ error: "Pick an avatar first." }, { status: 400 });

  const quality = QUALITIES.includes(body.quality as VideoQuality)
    ? (body.quality as VideoQuality)
    : "high";
  const interactivity = INTERACTIVITY.includes(body.interactivity as Interactivity)
    ? (body.interactivity as Interactivity)
    : "CONVERSATIONAL";

  const persona: Record<string, unknown> = { language: body.language || "en" };
  if (body.voiceId) persona.voice_id = body.voiceId;
  if (body.contextId) persona.context_id = body.contextId;
  // Without a context the avatar starts in restricted mode and won't answer.
  if (typeof body.speed === "number" && Number.isFinite(body.speed)) {
    persona.voice_settings = { speed: Math.min(1.2, Math.max(0.8, body.speed)) };
  }

  const payload: Record<string, unknown> = {
    mode: "FULL",
    avatar_id: avatarId,
    video_settings: { quality, encoding: "H264" },
    avatar_persona: persona,
    interactivity_type: interactivity,
  };
  if (typeof body.maxSessionDuration === "number" && body.maxSessionDuration > 0) {
    payload.max_session_duration = Math.floor(body.maxSessionDuration);
  }
  if (body.dynamicVariables && Object.keys(body.dynamicVariables).length > 0) {
    payload.dynamic_variables = body.dynamicVariables;
  }

  try {
    const grant = await liveAvatar<TokenResponse>("/v1/sessions/token", {
      method: "POST",
      json: payload,
    });
    if (!grant?.session_token) {
      return NextResponse.json(
        { error: "HeyGen returned no session token." },
        { status: 502 },
      );
    }
    return NextResponse.json({
      sessionId: grant.session_id ?? "",
      sessionToken: grant.session_token,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
