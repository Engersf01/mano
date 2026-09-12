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
  };
}
