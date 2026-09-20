import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { SITE_ORIGIN } from "@/lib/site";

export const metadata: Metadata = {
  /**
   * Every relative path in a `canonical` or `openGraph` entry is resolved
   * against this. Left unset, Next resolves them against `localhost:3000`,
   * which is what a chat app would then show a preview of.
   */
  metadataBase: new URL(SITE_ORIGIN),
  title: "Mano · Spatial presentation platform",
  description:
    "AI-enhanced cinematic presentation system controlled entirely by hand gestures.",
  applicationName: "Mano",
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
