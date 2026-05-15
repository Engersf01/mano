"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Earth,
  Hand,
  Layers3,
  Move3d,
  Rewind,
  Sparkles,
  Aperture,
} from "lucide-react";

const MODES = [
  { Icon: Move3d, label: "Spatial", desc: "Slides orbiting around you" },
  { Icon: Brain, label: "Brain", desc: "Knowledge as neurons" },
  { Icon: Earth, label: "Globe", desc: "Stories pinned to places" },
  { Icon: Rewind, label: "Timeline", desc: "Chronological flythrough" },
  { Icon: Layers3, label: "Zoom", desc: "Cinematic Prezi-style" },
  { Icon: Aperture, label: "Classic", desc: "When you need it flat" },
];

const GESTURES = [
  ["Swipe", "navigate"],
  ["Pinch", "grab + draw"],
  ["Two-hand", "zoom + rotate"],
  ["Air-tap", "drop sticky"],
  ["Open palm", "open radial"],
  ["Circle", "open tools"],
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="aurora-bg" />
      <div className="absolute inset-0 -z-10 [background-image:radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-aurora-cyan/15 text-aurora-cyan">
            <Hand size={16} />
          </div>
          <span className="font-display text-lg tracking-tight">Mano</span>
        </div>
        <nav className="flex items-center gap-2 text-sm text-ink-200">
          <Link href="/calibrate" className="rounded-xl px-3 py-1.5 hover:bg-white/5 hover:text-white">
            Calibrate
          </Link>
          <Link
            href="/present"
            className="flex items-center gap-1 rounded-xl bg-aurora-cyan/15 px-3 py-1.5 text-aurora-cyan hover:bg-aurora-cyan/25"
          >
            Open stage <ArrowRight size={14} />
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-8 pt-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.25em] text-ink-200 backdrop-blur"
        >
          <Sparkles size={12} className="text-aurora-cyan" /> Spatial · Cinematic · Gesture-native
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.05 }}
          className="font-display text-balance text-6xl font-medium tracking-tight md:text-7xl"
        >
          A presentation platform <br />
          <span className="bg-gradient-to-r from-aurora-cyan via-aurora-violet to-aurora-pink bg-clip-text text-transparent">
            you wave into being.
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mt-6 max-w-2xl text-balance text-lg text-ink-200"
        >
          Mano fuses MediaPipe hand tracking, a React-Three-Fiber stage, and an
          on-stage AI assistant so your story moves with your hands — no clicker,
          no remote, no rectangle.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/present"
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-aurora-cyan to-aurora-violet px-5 py-3 text-sm font-medium text-ink-950 transition-transform hover:scale-[1.02]"
          >
            Enter the stage
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/calibrate"
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm text-ink-100 hover:bg-white/10"
          >
            Run calibration
          </Link>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto mt-24 grid max-w-6xl gap-4 px-8 md:grid-cols-3">
        {MODES.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.04 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-5 backdrop-blur-3xl"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-cyan/10 text-aurora-cyan">
              <m.Icon size={18} />
            </div>
            <div className="text-base font-medium text-white">{m.label}</div>
            <div className="text-sm text-ink-300">{m.desc}</div>
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-aurora-cyan/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </motion.div>
        ))}
      </section>

      <section className="relative z-10 mx-auto mt-12 max-w-6xl px-8 pb-24">
        <div className="rounded-2xl border border-white/10 bg-ink-900/40 p-6 backdrop-blur-3xl">
          <div className="mb-4 text-[11px] uppercase tracking-[0.25em] text-ink-400">
            Built-in gesture vocabulary
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {GESTURES.map(([g, l]) => (
              <div
                key={g}
                className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2"
              >
                <div className="text-sm text-white">{g}</div>
                <div className="text-[11px] uppercase tracking-wider text-ink-400">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-ink-500">
          Mano runs entirely in the browser. Hand landmarks never leave your
          device.
        </p>
      </section>
    </main>
  );
}
