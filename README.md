# Mano

**Spatial AI presentation platform controlled entirely by hand gestures.**

Mano is a web app where a presenter steers a cinematic 3D presentation with their hands. Slides orbit you in space, the world reshapes between modes, and an on-stage AI assistant listens, captions, and coaches in real time — all running in the browser.

> Think *Minority Report*, Apple Vision Pro keynote, and an interactive TED Talk fused into a single, single-page React app.

## Live experience

Open `/` to land. From there you can:

- **Run calibration** — `/calibrate` walks you through the gesture vocabulary while the camera is live.
- **Open the stage** — `/present` is the full presenter view: 3D scene, presenter notes, camera tile with hand overlay, AI panel, control dock.
- **Audience window** — click *Audience* on the dock to pop out a clean `/audience` route on a second monitor.

## Stack

| Layer | Choice |
|---|---|
| App framework | Next.js 15 (App Router) |
| Language | TypeScript strict |
| UI | React 18 + Tailwind + shadcn primitives + Framer Motion |
| 3D | three.js, @react-three/fiber, @react-three/drei |
| Perception | @mediapipe/tasks-vision (HandLandmarker, GPU delegate, web worker) |
| State | Zustand (5 stores, subscribe-with-selector) |
| Motion | Framer Motion + GSAP-style easing built into transitions |
| AI | OpenAI (optional) → falls back to local heuristic intent router |

## Architecture (six layers)

```
PERCEPTION → GESTURE → INTENT → STATE → RENDER → PLATFORM
```

- **Perception** runs MediaPipe in a Web Worker (`src/perception/hands.worker.ts`) at ~30 fps. The main thread sends `ImageBitmap`s, the worker streams 21 landmarks × 2 hands back.
- **Gesture** smooths each landmark with a [1€ filter](https://gery.casiez.net/1euro/) (`src/gestures/filters/oneEuro.ts`) and runs a battery of FSM detectors in `src/gestures/detectors/*`. Each detector emits semantic events with a confidence score.
- **Intent** (`src/gestures/intents.ts`) maps semantic events to deck/scene/tool actions — this is where gestures become app behavior.
- **State** is six Zustand stores: `gesture`, `deck`, `scene`, `tools`, `annotation`, `presenter`, `ai`.
- **Render** is a hybrid stack: R3F for the spatial stage, DOM-on-top for HUD chrome (presenter dock, AI panel, captions). One Canvas, six modes.
- **Platform** is Next.js App Router with one edge function (`/api/ai`) and full client-side rendering for the interactive routes.

## Gesture vocabulary

| Gesture | Intent |
|---|---|
| **Swipe ←/→** (open palm) | Previous / next slide |
| **Pinch** (thumb + index) | Grab / draw (pen, marker, highlight) |
| **Double pinch** | Focus the current slide |
| **Two-hand pinch** | Zoom + rotate the world |
| **Air-tap** (index thrust) | Drop a sticky / select |
| **Point** | Laser pointer + air cursor |
| **Open palm** (held) | Wake / open radial menu |
| **Circle** (index) | Open tool radial |
| **Grab** (fist) | Hold an object |
| **Flick down** | Hide toolbox |

Each detector emits `{ name, phase, confidence, hand, data }`. Confidence floors prevent accidental fires; cooldowns prevent double-fires.

## Modes

All six modes share a single scene graph and slide primitive — switching between them is camera + layout choreography, not a remount.

- **Classic** — linear horizontal carousel
- **Spatial** — slides orbit you in 3D (default)
- **Brain** — slides as neurons on a Fibonacci sphere, wired with edges
- **Globe** — slides pinned to lat/lng on a wireframe Earth
- **Timeline** — chronological gantt-like rail with a moving cursor
- **Zoom** — Prezi-style infinite canvas, slides at varying depths

## Annotation

The annotation toolkit lives on a single 2D canvas overlay over the stage (`src/ui/tools/AnnotationCanvas.tsx`). Pen, marker, highlight, shapes, arrows. Multi-layer per slide, undo/redo. Sticky notes are DOM, drag-able, collapsible, and can be air-tapped into place.

## AI features

- **Stage Assistant** — chat panel calls `/api/ai`. With `OPENAI_API_KEY` set it uses `gpt-4o-mini`; without, a local heuristic responds. The assistant can return `{ "intent": "set-mode", "mode": "brain" }` to drive the scene.
- **Live captions** — Web Speech API, multilingual (EN/ES/FR/DE/JP).
- **Speaker coach** — words-per-minute, filler-word count, sentiment tag (`calm` / `engaged` / `rushed`).
- **Translation hook** — UI in place, server route ready to extend.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run typecheck
```

Set `OPENAI_API_KEY` in `.env.local` to enable the AI assistant; without it, Mano falls back to local heuristics.

## Performance

- Hand detection runs in a Web Worker with GPU delegate
- AdaptiveDpr scales canvas resolution under load
- Slide content rendered via R3F `<Html transform>` for crisp typography without DOM-in-WebGL cost
- Annotation strokes batched onto a single canvas
- Six modes lazy-mount only the active one
- Workers receive `ImageBitmap`s transferred zero-copy

Camera frames and landmarks never leave the device. The only network call is the optional `/api/ai` edge function.

## File map

```
app/
  page.tsx                     landing
  present/                     presenter view (camera + HUD + stage)
  audience/                    clean audience render
  calibrate/                   gesture walkthrough
  api/ai/route.ts              edge AI assistant
src/
  perception/                  MediaPipe worker + hook
  gestures/                    1€ filter, detectors, engine, intents
  store/                       Zustand stores
  scenes/                      R3F Stage, primitives, six modes
  ui/                          presenter chrome, tools, overlays
  ai/                          speech, coach
  lib/                         webcam, idb, utils
  data/sampleDeck.ts           the demo deck
```

## Roadmap

- WebGPU renderer when stable in Safari
- WebRTC presenter ↔ audience channel for cross-device sync (currently uses `localStorage` event channel for same-machine)
- Per-presenter gesture model fine-tuning (TF.js MLP on landmark sequences)
- Collaborative annotation (Y.js)
- Slide import from PPTX / Keynote / Google Slides
- AI-generated decks from a prompt

## License

MIT
