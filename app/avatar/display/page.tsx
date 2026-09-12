"use client";
import dynamic from "next/dynamic";

const DisplayClient = dynamic(() => import("./DisplayClient"), {
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-ink-950" />,
});

export default function AvatarDisplayPage() {
  return <DisplayClient />;
}
