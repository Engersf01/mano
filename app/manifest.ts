import type { MetadataRoute } from "next";

/**
 * Installing the panel to the Android home screen is the only way to lose the
 * browser's address bar for good — the Fullscreen API covers a tap-to-start
 * session, but an installed app opens chrome-free every time, which is what a
 * kiosk display needs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mano Avatar Panel",
    short_name: "Avatar",
    description: "Live avatar display for an attached panel.",
    start_url: "/avatar/display",
    display: "fullscreen",
    orientation: "any",
    background_color: "#03040c",
    theme_color: "#03040c",
    // Android refuses the install prompt outright without an icon of at least
    // 192px, so this is not decoration — it is what makes the panel
    // installable. The `maskable` copy is drawn inside the safe circle: the
    // launcher crops whatever shape the device uses, and a full-bleed icon
    // loses its edges to it.
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
