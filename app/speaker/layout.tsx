import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Speaker hub · Watch, book, volunteer",
  description:
    "Watch the session recap, book a 15–20 minute 1:1 across the October 2–4 weekend, volunteer for the October 3 session, or leave feedback.",
};

export default function SpeakerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/*
        The rest of Mano is kiosk software, so `globals.css` pins
        `overflow: hidden` on html and body — a presentation stage must never
        scroll under someone's hand. The speaker hub is the opposite: a long
        public page read on a phone, where a nested scroll container would cost
        the browser's own scroll behaviour (the URL bar that hides, the
        rubber-band at the ends, the tap-status-bar-to-top gesture).

        A plain <style> in this subtree's layout hands page scrolling back for
        these routes only, with no JavaScript and no flash of an unscrollable
        page, and React removes it again on navigation away.
      */}
      <style>{`html, body { overflow: auto; height: auto; }`}</style>
      {children}
    </>
  );
}
