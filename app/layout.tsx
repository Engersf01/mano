import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
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
