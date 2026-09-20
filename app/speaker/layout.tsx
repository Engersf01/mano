import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { socialPreview } from "@/lib/brand";

const TITLE = "NeumoMeet · Mira, reserva, participa";
const DESCRIPTION =
  "Mira el resumen de la sesión, reserva un 1:1 de 15–20 minutos durante el fin de semana del 2 al 4 de octubre, apúntate como voluntario para la sesión del 3 de octubre, o deja tus comentarios.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Repeated rather than inherited: Next replaces a parent's `openGraph`
  // wholesale when a route declares one, so leaving the image out here would
  // strip the preview card off the very page that gets shared from a slide.
  // Icons are a separate field and do carry over from the root layout.
  openGraph: {
    type: "website",
    siteName: "NeumoMeet 2026",
    locale: "es_ES",
    title: TITLE,
    description: DESCRIPTION,
    images: [socialPreview],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [socialPreview],
  },
};

/**
 * White, against the root layout's near-black.
 *
 * `theme-color` is the one piece of the dark theme a stylesheet cannot reach:
 * it paints the browser's own chrome — the address bar on Android Chrome, the
 * status area on an installed iOS web app. Inherited from the root it puts a
 * near-black bar directly above a white page, which on a phone is the first
 * thing anyone sees of this brand.
 */
export const viewport: Viewport = {
  themeColor: "#ffffff",
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
      {/*
        `lang` on a wrapper rather than on <html>, which only the root layout
        renders — and the rest of the app is in English, so flipping it there
        would mislabel the kiosk instead.

        It is not decoration: it picks the voice a screen reader uses, and an
        English synthesiser reading "¿Qué tan valiosa fue nuestra
        conversación?" is unintelligible. It also drives hyphenation and the
        spell-checker inside every textarea on these pages.
      */}
      <div lang="es">{children}</div>
    </>
  );
}
