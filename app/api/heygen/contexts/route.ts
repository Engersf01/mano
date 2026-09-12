import { NextResponse } from "next/server";
import { errorResponse, liveAvatar } from "@/heygen/api";
import {
  fromContextDraft,
  parseContextDraft,
  toContext,
  toContextSummary,
  type RawContext,
} from "@/heygen/normalize";
import type { Paginated } from "@/heygen/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

/**
 * List the account's contexts — a context is the avatar's knowledge and
 * personality. Rows carry id/name/timestamps only; fetch one by id for the body.
 */
export async function GET(req: Request) {
  const page = new URL(req.url).searchParams.get("page") ?? "1";
  try {
    const list = await liveAvatar<Paginated<RawContext>>("/v1/contexts", {
      query: { page, page_size: PAGE_SIZE },
    });
    return NextResponse.json({
      contexts: (list?.results ?? []).map(toContextSummary),
      count: list?.count ?? 0,
      hasMore: Boolean(list?.next),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = parseContextDraft(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const created = await liveAvatar<RawContext>("/v1/contexts", {
      method: "POST",
      json: fromContextDraft(parsed.draft),
    });
    return NextResponse.json({ context: toContext(created) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
