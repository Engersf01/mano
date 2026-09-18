import { NextResponse } from "next/server";
import { publicState } from "@/speaker/derive";
import { readData } from "@/server/speakerStore";

export const runtime = "nodejs";
/** Availability changes mid-event; a cached slot grid books someone into a
 *  slot the host closed ten minutes ago. */
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await readData();
  return NextResponse.json(publicState(data), {
    headers: { "Cache-Control": "no-store" },
  });
}
