/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async headers() {
    // Camera access + cross-origin isolation so MediaPipe's GPU/WASM backend
    // can use SharedArrayBuffer where available.
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self)",
          },
        ],
      },
    ];
  },
};

export default config;
