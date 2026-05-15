"use client";
import dynamic from "next/dynamic";

const AudienceClient = dynamic(() => import("./AudienceClient"), {
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-ink-950" />,
});

export default function AudiencePage() {
  return <AudienceClient />;
}
