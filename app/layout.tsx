import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { icons, siteUrl, socialPreview } from "@/lib/brand";

export const metadata: Metadata = {
  // Every route inherits this, which is the point: one favicon and one link
  // preview for the whole deployment, whichever page someone lands on or
  // pastes into a chat.
  metadataBase: siteUrl,
  title: "Mano · Spatial presentation platform",
  description:
    "AI-enhanced cinematic presentation system controlled entirely by hand gestures.",
  applicationName: "Mano",
  icons,
  openGraph: {
    type: "website",
    siteName: "NeumoMeet 2026",
    title: "Mano · Spatial presentation platform",
    description:
      "AI-enhanced cinematic presentation system controlled entirely by hand gestures.",
    images: [socialPreview],
  },
  twitter: {
    // Without this a card renders as a thumbnail beside the text, which at
    // 120px makes the tagline unreadable and the lockup a smudge.
    card: "summary_large_image",
    images: [socialPreview],
  },
};

export const viewport: Viewport = {
  themeColor: "#03040c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
