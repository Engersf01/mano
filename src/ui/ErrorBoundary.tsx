"use client";
import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string | null; stack: string | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null, stack: null };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("[Mano] stage error", error);
    if (info.componentStack) {
      console.error("[Mano] component stack", info.componentStack);
      this.setState({ stack: (error.stack ?? "") + "\n\n" + info.componentStack });
    }
  }

  reset = () => this.setState({ hasError: false, message: null, stack: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-ink-950 px-6">
        <div className="max-w-2xl rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 backdrop-blur-3xl">
          <div className="mb-1 text-[11px] uppercase tracking-[0.25em] text-rose-300/80">
            Stage error
          </div>
          <h2 className="font-display text-2xl tracking-tight text-white">
            Something went sideways
          </h2>
          <p className="mt-2 break-words text-sm text-ink-200">
            {this.state.message ?? "An unexpected render error occurred."}
          </p>
          {this.state.stack && (
            <pre className="mt-4 max-h-72 overflow-auto rounded-xl border border-white/10 bg-ink-950/60 p-3 text-left font-mono text-[11px] leading-relaxed text-ink-300">
              {this.state.stack}
            </pre>
          )}
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              onClick={() => location.reload()}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
            >
              Reload
            </button>
            <button
              onClick={this.reset}
              className="rounded-xl bg-aurora-cyan/15 px-4 py-2 text-sm text-aurora-cyan hover:bg-aurora-cyan/25"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
