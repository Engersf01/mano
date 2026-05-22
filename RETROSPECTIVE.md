# Mano — Build Retrospective

A candid post-mortem of the first build attempt: what worked, what didn't, and
a ready-to-use prompt for starting fresh while avoiding the same traps.

---

## What worked

- **The stack, once pinned correctly:** Next.js 14.2 + React 18.2 +
  React-Three-Fiber v8 + Zustand + MediaPipe Tasks (web worker). It builds,
  deploys to Vercel, and renders a real 3D stage.
- **Architecture separation:** `perception → gesture → intent → state → render`
  was a clean mental model and made debugging tractable.
- **Canvas-texture slides** instead of drei `<Html>` portals — lighter and
  crash-free.
- **The two-phase concept** (left hand = choose view, right hand = present) —
  the *idea* is right; the execution is what fell short.
- **Distance-from-wrist finger detection** beat joint-angle math.
- **Diagnostic discipline** — when we hit a minified React error, decoding the
  production chunk to find the exact culprit line worked.

## What did NOT work (the traps)

1. **Latency is the core unsolved problem.** Browser MediaPipe has a ~60–100ms
   floor, *plus* smoothing-filter lag, *plus* animation lag. No amount of tuning
   made continuous tracking feel crisp. **This is what kept it from feeling
   right.**
2. **We built breadth before nailing the core.** 6 modes, AI assistant,
   captions, annotations, presenter + audience views — all before a single
   gesture felt instant and reliable. The one thing that mattered (does "next
   slide" feel great?) was never validated first.
3. **Custom landmark detectors were endlessly finicky** — swipe, pinch-tap,
   finger-count all needed constant threshold tuning and still misfired.
4. **Continuous/dwell interactions amplify lag.** The radial dwell menu and
   cursor-follow were the worst-feeling parts.
5. **Version hell ate hours.** Next 15.5 silently forces React 19 RC, which
   breaks R3F v8's `react-reconciler@0.27`.
6. **Zustand selectors returning fresh `[]`/objects** caused an infinite-render
   crash (React error #185).
7. **MediaPipe handedness is mirror-relative** — labels were swapped versus a
   selfie view.
8. **Two simultaneously-live hands felt confusing** even after the phase split.

## The meta-lesson

Two hard problems (real-time gesture recognition + 3D spatial UI) were combined
before *either* was proven enjoyable on its own. A fresh start should validate
the gesture feel in the simplest possible shell first, lean on **pre-trained
gesture recognition instead of hand-rolled math**, and treat every gesture as
**discrete with instant visual confirmation**.

---

## Prompt for a fresh start (paste into a new conversation)

> **Build "Mano v2" — a gesture-controlled presentation tool. Read these
> hard-won constraints first; they come from a previous attempt that worked
> technically but never felt good.**
>
> **Guiding principle: prove the gesture feel before building any features.** Do
> not build modes, AI, annotations, or multiple views until a single gesture
> ("next slide") feels instant and reliable on my real webcam. I will test after
> each milestone.
>
> **Milestone 1 — Core gesture loop only (no 3D, no extras):**
> - Next.js 14.2.x (App Router) + React 18.2.0 + TypeScript + Tailwind. Pin
>   these exact major versions. Add a `package.json` `overrides` block forcing
>   react/react-dom to 18.2.0. Do NOT use Next 15 (it forces React 19 RC and
>   breaks downstream libs). Use `next.config.mjs` (not `.ts`).
> - Hand input: **MediaPipe Tasks `GestureRecognizer`** (the pre-trained one
>   that returns canonical gestures like `Open_Palm`, `Closed_Fist`,
>   `Pointing_Up`, `Victory`, `Thumb_Up`), running in a **web worker**, GPU
>   delegate, input downscaled to ~256px, `numHands: 1` for now. Do NOT
>   hand-roll landmark-angle detectors.
> - A plain 2D/DOM slide deck (just styled divs, ~5 slides).
> - One gesture: open-palm swipe left/right → prev/next slide. The instant a
>   gesture is recognized, flash an on-screen confirmation immediately, even
>   before the slide animates, so latency is masked.
> - On-screen live debug readout: detected gesture name + confidence + fps,
>   always visible.
> - Keyboard arrows must also work (fallback + comparison baseline).
> - Deploy to Vercel. I will test and tell you how the latency/reliability feels
>   before we proceed.
>
> **Milestone 2 (only after I approve M1):** add a second discrete gesture and a
> left-hand/right-hand split if M1 proved two-hand tracking is responsive
> enough. Use **discrete poses, never dwell-timers or cursor-follow selection.**
>
> **Milestone 3+ (only after approval):** 3D stage with R3F v8, multiple views,
> annotations, etc.
>
> **Known footguns — avoid these explicitly:**
> - **Zustand selectors must return stable references.** Never
>   `useStore(s => s.x ?? [])` — the fresh `[]` triggers an infinite render loop
>   (React error #185). Use a module-level constant for empty defaults.
> - **MediaPipe handedness is mirror-relative.** If you feed the raw
>   (non-selfie-mirrored) camera frame, Left/Right labels are swapped — correct
>   for it.
> - **Don't use drei `<Html>` for slide content** — it spawns React portals that
>   were unstable. Use canvas textures or DOM-over-canvas.
> - **Don't stack animation smoothing on top of detection latency.** Keep
>   camera/UI lerps fast (≥0.3) so discrete actions land immediately.
> - **Avoid continuous gestures** (cursor-follow, dwell-to-select,
>   hold-to-confirm). They make the ~80ms latency floor glaringly obvious.
>   Prefer instant discrete poses.
> - Throttle any high-frequency state that drives React re-renders; keep
>   per-frame data out of React (read via `getState` in a RAF loop).
>
> **Be realistic with me:** if in-browser gesture latency makes precise control
> (drawing, menu selection) feel bad, say so and recommend a hybrid (gestures
> for big discrete moves, keyboard/clicker for precision) rather than forcing
> everything onto gestures.
>
> Reference repo from attempt 1: github.com/Engersf01/mano

---

## The single most important change for v2

Switch to MediaPipe's pre-trained **`GestureRecognizer`** instead of the custom
landmark math, and **validate that "next slide" feels good before building
anything else.** That ordering is what would have saved this build.
