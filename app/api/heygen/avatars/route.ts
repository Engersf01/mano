import { NextResponse } from "next/server";
import { errorResponse, liveAvatar } from "@/heygen/api";
import { toAvatar, type RawAvatar } from "@/heygen/normalize";
import type { Paginated } from "@/heygen/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

/**
 * Avatars the account can stream: the caller's own avatars first, then HeyGen's
 * public library.
 *
 * The private list 404s or 403s on accounts without custom avatars, so its
 * failure is non-fatal — a missing public list is the real error.
 */
export async function GET(req: Request) {
  const page = new URL(req.url).searchParams.get("page") ?? "1";
  const query = { page, page_size: PAGE_SIZE };

  try {
    const [publicList, ownList] = await Promise.all([
      liveAvatar<Paginated<RawAvatar>>("/v1/avatars/public", { query }),
      liveAvatar<Paginated<RawAvatar>>("/v1/avatars", { query }).catch(() => null),
    ]);

    const seen = new Set<string>();
    const avatars = [
      ...(ownList?.results ?? []).map((raw) => toAvatar(raw, "user")),
      ...(publicList?.results ?? []).map((raw) => toAvatar(raw, "public")),
    ].filter((avatar) => {
      if (seen.has(avatar.id)) return false;
      seen.add(avatar.id);
      return true;
    });

    return NextResponse.json({
      avatars,
      count: (publicList?.count ?? 0) + (ownList?.count ?? 0),
      hasMore: Boolean(publicList?.next ?? ownList?.next),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
