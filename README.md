# Mano v2

**A gesture-controlled presentation tool — rebuilt from scratch, gesture-feel first.**

This is the v2 rewrite. v1 worked technically but never *felt* right (see
[`RETROSPECTIVE.md`](./RETROSPECTIVE.md) for the full post-mortem). v2 follows
one rule:

> **Prove the gesture before building any features.** No 3D, no modes, no AI
> until a single gesture — "next slide" — feels instant and reliable on a real
> webcam.

## Milestone 1 (this build)

A plain 2D slide deck driven by **one** gesture: hold up an open palm and swipe
left/right to go prev/next.

- **Pre-trained recognition.** MediaPipe Tasks `GestureRecognizer` runs in a web
  worker (GPU delegate) and reports canonical poses like `Open_Palm` directly —
  no hand-rolled landmark math. We only watch how the open palm *moves*.
- **Discrete, not continuous.** A swipe is a single fired event with a cooldown.
  No dwell timers, no cursor-follow — those are what made v1's latency obvious.
- **Latency masked.** The instant a swipe is recognized, an on-screen flash
  confirms it — before the slide finishes animating.
- **Always-on debug readout.** Detected gesture, confidence, and fps are shown
  live so you can judge reliability at a glance.
- **Keyboard baseline.** Arrow keys (and space) navigate too — your reference for
  how snappy gestures *should* feel.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js **14.2** (App Router) — pinned; Next 15 forces React 19 RC |
| React | **18.2.0** — pinned via `package.json` `overrides` |
| Language | TypeScript (strict) |
| Styling | Tailwind |
| Perception | `@mediapipe/tasks-vision` `GestureRecognizer`, web worker, GPU |
| State | Zustand (one store) |

## Architecture

```
PERCEPTION → GESTURE → STATE → RENDER
```

- **Perception** — `src/perception/`. The webcam frame is downscaled to ~256px,
  sent to `gesture.worker.ts` as an `ImageBitmap` (zero-copy transfer), and the
  worker returns the top gesture + wrist position. `useGestureRecognition.ts`
  owns the camera, worker, and frame pump. Per-frame telemetry lives in
  `liveStats.ts` — a singleton *outside* React.
- **Gesture** — `src/gestures/swipe.ts`. Watches open-palm horizontal motion and
  emits a discrete `next` / `prev`. All thresholds are in one tunable block.
- **State** — `src/store/deck.ts`. A tiny Zustand store; only discrete
  navigation events touch it.
- **Render** — `src/ui/`. `Deck.tsx` is the orchestrator; the debug HUD and
  camera tile read `liveStats` via a rAF loop (`useLiveStatsSnapshot.ts`) and
  re-render only when a displayed value changes.

## Footguns avoided (carried over from v1)

- Zustand selectors return stable references (no fresh `[]`/`{}` per render).
- MediaPipe handedness is mirror-relative — we mirror raw image x into screen
  space for swipe direction.
- No drei `<Html>` portals (no R3F at all in M1).
- High-frequency per-frame data stays out of React; the HUD reads it from rAF.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
```

Open the page, allow camera access, hold up an open palm, and swipe. The model
(~few MB) and the MediaPipe WASM load from a CDN on first run, so the very first
load needs network; everything then runs locally on-device. No frames ever leave
the browser.

## Deployment

Two options:

1. **Vercel Git integration (recommended, zero config).** Import the repo at
   [vercel.com/new](https://vercel.com/new). Vercel auto-detects Next.js,
   deploys `main`, and gives every PR a preview URL. If you use this, delete
   `.github/workflows/deploy-vercel.yml`.
2. **GitHub Actions.** `.github/workflows/deploy-vercel.yml` deploys production
   on push to `main`. It stays dormant (no red X) until you add three repo
   secrets — `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (run
   `vercel link` locally to get the two IDs).

`.github/workflows/ci.yml` runs typecheck + production build on every push and
PR, no secrets required.

## What's next (only after M1 is approved)

- **M2** — a second discrete gesture and a left/right hand split, *if* M1 proves
  two-hand tracking is responsive enough. Discrete poses only.
- **M3+** — 3D stage (R3F v8), multiple views, annotations.

## License

MIT
