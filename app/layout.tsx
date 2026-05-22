import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mano v2 — gesture deck",
  description:
    "Milestone 1: drive a slide deck with an open-palm swipe. Pre-trained MediaPipe GestureRecognizer, discrete gestures, instant feedback.",
};

export const viewport: Viewport = {
  themeColor: "#03040c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
