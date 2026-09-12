import { NextResponse } from "next/server";
import { errorResponse, liveAvatar } from "@/heygen/api";
import { toVoice, type RawVoice } from "@/heygen/normalize";
import type { Paginated } from "@/heygen/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

/** Voices available for the avatar persona. `?type=private` for cloned voices. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const voiceType = params.get("type") === "private" ? "private" : "public";

  try {
    const list = await liveAvatar<Paginated<RawVoice>>("/v1/voices", {
      query: { page: params.get("page") ?? "1", page_size: PAGE_SIZE, voice_type: voiceType },
    });
    return NextResponse.json({
      voices: (list?.results ?? []).map(toVoice),
      count: list?.count ?? 0,
      hasMore: Boolean(list?.next),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
