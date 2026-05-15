"use client";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Mano] route error", error);
  }, [error]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-ink-950 px-6 text-center">
      <div className="max-w-xl rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 backdrop-blur-3xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-rose-300">
          <AlertTriangle size={12} /> client error
        </div>
        <h2 className="font-display text-2xl tracking-tight text-white">
          Something went wrong loading the stage
        </h2>
        <p className="mt-3 break-words text-sm text-ink-200">
          {error.message || "Unknown error"}
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-[11px] text-ink-500">
            digest: {error.digest}
          </p>
        )}
        <pre className="mt-4 max-h-48 overflow-auto rounded-xl border border-white/10 bg-ink-950/60 p-3 text-left font-mono text-[11px] text-ink-300">
          {error.stack ?? ""}
        </pre>
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-xl bg-aurora-cyan/15 px-4 py-2 text-sm text-aurora-cyan hover:bg-aurora-cyan/25"
          >
            <RefreshCw size={14} /> Try again
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
          >
            <Home size={14} /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
