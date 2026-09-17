import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "NeumoMeet · Watch, book, volunteer",
  description:
    "Watch the session recap, book a 15–20 minute 1:1 across the October 2–4 weekend, volunteer for the October 3 session, or leave feedback.",
};

export default function SpeakerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/*
        Two things `globals.css` sets for the kiosk have to be undone here, and
        only here.

        It pins `overflow: hidden` on html and body — a presentation stage must
        never scroll under someone's hand. The hub is the opposite: a long
        public page read on a phone, where a nested scroll container would cost
        the browser's own scroll behaviour (the URL bar that hides, the
        rubber-band at the ends, the tap-status-bar-to-top gesture).

        It also paints the body near-black and declares `color-scheme: dark`,
        which the hub's white branding contradicts. `color-scheme` reaches past
        the backdrop: it decides whether a native checkbox, scrollbar or
        autofill highlight is drawn light or dark, and leaving it on `dark`
        under white panels is how a ticked box ends up invisible.

        A plain <style> in this subtree's layout does both with no JavaScript
        and no flash of a dark, unscrollable page, and React removes it again
        on navigation away.
      */}
      <style>{`
        html, body { overflow: auto; height: auto; }
        body { background: #ffffff; color: #0f172a; color-scheme: light; }
      `}</style>
      {children}
    </>
  );
}
