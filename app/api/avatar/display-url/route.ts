import { networkInterfaces } from "node:os";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * LAN addresses the display route can be opened on, so the Android panel can be
 * pointed at this machine without hunting for an IP by hand.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const room = url.searchParams.get("room")?.trim() || "default";
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  const path = `/avatar/display?room=${encodeURIComponent(room)}`;

  const addresses: string[] = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      // Node <18.4 reported family as the number 4; newer versions use "IPv4".
      const isIPv4 = entry.family === "IPv4" || (entry.family as unknown as number) === 4;
      if (isIPv4 && !entry.internal) addresses.push(entry.address);
    }
  }

  return NextResponse.json({
    path,
    origin: url.origin,
    candidates: addresses.map((address) => `${url.protocol}//${address}:${port}${path}`),
    /**
     * Mic capture and the screen wake lock need a secure context. Over plain
     * http:// on a LAN IP the display can still show and speak — it just can't
     * listen or hold the screen awake.
     */
    secure: url.protocol === "https:",
  });
}
