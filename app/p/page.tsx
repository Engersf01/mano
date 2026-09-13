"use client";
import dynamic from "next/dynamic";

/**
 * `/p` — the short address the panel is typed into.
 *
 * Deliberately two characters: the monitor at the stand has an on-screen
 * keyboard and no clipboard, and everything that used to live in the query
 * string now lives behind a PIN instead.
 */
const PinPad = dynamic(() => import("./PinPad"), {
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-ink-950" />,
});

export default function PanelEntryPage() {
  return <PinPad />;
}
