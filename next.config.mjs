/** @type {import('next').NextConfig} */

/**
 * The hostname the short conference URL is served from. Kept in sync with
 * `SITE_HOST` in `src/lib/site.ts`, which this file cannot import: Next reads
 * its config before any TypeScript is compiled.
 */
const SITE_HOST = process.env.NEXT_PUBLIC_SITE_HOST ?? "meet.engers.me";

const config = {
  reactStrictMode: false,
  transpilePackages: ["three"],
  experimental: {
    optimizePackageImports: [
      "@react-three/drei",
      "@react-three/fiber",
      "lucide-react",
      "framer-motion",
    ],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: "asset/source",
    });
    return config;
  },
  /**
   * The conference address is printed on a slide and typed from the back of a
   * room, so it has to be the whole URL — `meet.engers.me`, not
   * `meet.engers.me/speaker`. On that host `/` therefore serves the hub.
   *
   * It is a rewrite rather than a redirect so the address bar keeps showing
   * the short form after the page loads; the hub's canonical tag points back
   * at it, so the two paths do not compete.
   *
   * `beforeFiles` is required: `/` is a real page (the Mano stage), and
   * `afterFiles` only runs for paths that matched nothing. The host condition
   * keeps every other deployment — the `vercel.app` URL, previews, localhost —
   * landing on the stage as before.
   */
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: SITE_HOST }],
          destination: "/speaker",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), display-capture=(self)" },
        ],
      },
    ];
  },
};

export default config;
