"use client";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Mano] global error", error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          margin: 0,
          padding: 24,
          minHeight: "100vh",
          background: "#03040c",
          color: "#f5f7fb",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 640,
            border: "1px solid rgba(244,63,94,0.3)",
            borderRadius: 16,
            padding: 24,
            background: "rgba(244,63,94,0.05)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#fda4af",
              marginBottom: 8,
            }}
          >
            global error
          </div>
          <h2 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.02em" }}>
            Mano hit an unrecoverable error
          </h2>
          <p style={{ marginTop: 12, fontSize: 14, color: "#c9cfe0" }}>
            {error.message || "Unknown error"}
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 4,
                fontFamily: "monospace",
                fontSize: 11,
                color: "#5e6685",
              }}
            >
              digest: {error.digest}
            </p>
          )}
          <pre
            style={{
              marginTop: 16,
              maxHeight: 200,
              overflow: "auto",
              padding: 12,
              background: "rgba(3,4,12,0.6)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              fontSize: 11,
              fontFamily: "monospace",
              color: "#9aa3bd",
            }}
          >
            {error.stack ?? ""}
          </pre>
          <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
            <button
              onClick={reset}
              style={{
                background: "rgba(96,245,255,0.15)",
                color: "#60f5ff",
                border: "none",
                padding: "8px 16px",
                borderRadius: 12,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: 12,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
