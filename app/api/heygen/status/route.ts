import { NextResponse } from "next/server";
import { hasApiKey } from "@/heygen/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lets the console explain a missing key up front instead of failing mid-flow. */
export async function GET() {
  return NextResponse.json({ configured: hasApiKey() });
}
