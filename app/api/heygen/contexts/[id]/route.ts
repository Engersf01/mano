import { NextResponse } from "next/server";
import { errorResponse, liveAvatar } from "@/heygen/api";
import { fromContextDraft, parseContextDraft, toContext, type RawContext } from "@/heygen/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

/** Encoded so a malformed id can't reshape the upstream path. */
const contextPath = (id: string) => `/v1/contexts/${encodeURIComponent(id)}`;

export async function GET(_req: Request, { params }: Params) {
  try {
    const context = await liveAvatar<RawContext>(contextPath(params.id));
    return NextResponse.json({ context: toContext(context) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = parseContextDraft(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const updated = await liveAvatar<RawContext>(contextPath(params.id), {
      method: "PATCH",
      json: fromContextDraft(parsed.draft),
    });
    return NextResponse.json({ context: toContext(updated) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await liveAvatar<null>(contextPath(params.id), { method: "DELETE" });
    return NextResponse.json({ deleted: params.id });
  } catch (err) {
    return errorResponse(err);
  }
}
