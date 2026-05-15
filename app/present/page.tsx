"use client";
import dynamic from "next/dynamic";

const PresentClient = dynamic(() => import("./PresentClient"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-ink-950 text-ink-300">
      <span className="text-xs uppercase tracking-[0.25em]">Loading stage…</span>
    </div>
  ),
});

export default function PresentPage() {
  return <PresentClient />;
}
