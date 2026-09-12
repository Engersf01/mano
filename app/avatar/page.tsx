"use client";
import dynamic from "next/dynamic";

const AvatarConsoleClient = dynamic(() => import("./AvatarConsoleClient"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-ink-950 text-ink-300">
      <span className="text-xs uppercase tracking-[0.25em]">Loading console…</span>
    </div>
  ),
});

export default function AvatarPage() {
  return <AvatarConsoleClient />;
}
