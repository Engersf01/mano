"use client";
import dynamic from "next/dynamic";

/**
 * `/speaker/host` — availability, rosters, results.
 *
 * Client-only: the console holds its passcode in session storage and asks for
 * everything over `fetch`, so there is nothing to render on the server, and
 * server-rendering a page that is about to be replaced by a passcode prompt
 * only makes the prompt arrive later.
 */
const HostClient = dynamic(() => import("./HostClient"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-white" />,
});

export default function HostPage() {
  return <HostClient />;
}
