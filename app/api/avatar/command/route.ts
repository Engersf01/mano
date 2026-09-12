import { NextResponse } from "next/server";
import { parseRole, peers, publish } from "@/server/channel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Publish one control message to the other role in the room. */
export async function POST(req: Request) {
  let body: { room?: string; role?: string; type?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const type = typeof body.type === "string" ? body.type.trim() : "";
  if (!type) return NextResponse.json({ error: "A message `type` is required." }, { status: 400 });

  const room = body.room?.trim() || "default";
  const message = publish(room, parseRole(body.role ?? null), type, body.payload);

  return NextResponse.json({ id: message.id, peers: peers(room) });
}
