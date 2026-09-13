# Avatar console

A HeyGen **LiveAvatar** session driven from this machine and rendered on an
attached Android display, plus a UI for managing what the avatar knows.

Two routes:

| Route | Runs on | Purpose |
|---|---|---|
| `/avatar` | your laptop | Operator console — pick the avatar, start/stop, speak, manage knowledge |
| `/avatar/display?room=<name>` | the Android panel | Full-bleed avatar video and audio. The only interaction is one activation tap |

## Setup

1. Put a LiveAvatar API key in `.env.local`:

   ```bash
   LIVEAVATAR_API_KEY=...
   ```

   Get it from [app.liveavatar.com/developers](https://app.liveavatar.com/developers)
   (log in with your HeyGen credentials).

   **LiveAvatar is a separate platform from HeyGen's classic API, and the two key
   types are not interchangeable** — a key from `app.heygen.com/settings?nav=API`
   is rejected here. `HEYGEN_API_KEY` is accepted as an alias for the variable
   name, but the *value* must be a LiveAvatar key.

   API access requires a paid plan. Without a key the console loads and says so,
   rather than failing mid-flow.

2. Start the server so the panel can reach it over the LAN:

   ```bash
   npm run dev -- --hostname 0.0.0.0
   # or: npm run build && npm run start -- --hostname 0.0.0.0
   ```

3. Open `/avatar` on your machine. The **Display** panel lists the LAN URLs for
   this server — open one in the Android browser and tap once to activate.

4. Create a context under **Knowledge**, select an avatar, press **Start session**.

## Standalone panel links

A link carrying `?avatar=<id>` runs the panel on its own: it starts that session
itself on the activation tap, with no console and no control channel.

```
/avatar/display?avatar=<id>&context=<id>&voice=<id>&lang=en&mic=1
```

| Param | Meaning |
|---|---|
| `avatar` | Avatar id — **presence of this is what enables standalone mode** |
| `context` | Knowledge context id |
| `voice` | Voice id (defaults to the avatar's own) |
| `lang` | Language code, default `en` |
| `quality` | `low` · `medium` · `high` (default) · `very_high` |
| `mode` | `CONVERSATIONAL` (default) or `PUSH_TO_TALK` |
| `speed` | Voice rate, 0.8–1.2 |
| `mic` | `1` to listen through the panel's microphone |
| `fit` `mirror` `captions` `bg` `scale` | Framing, same meanings as the console's Framing panel (`bg` defaults to pure black) |
| `chroma` | Green-backdrop removal. **On by default** — pass `chroma=0` for the raw feed |
| `key` | Backdrop colour to remove, hex without `#`. Omit it and the colour is **sampled from the feed** — set this only if detection picks wrong |
| `similarity` | Key strength as a fraction from the key colour (0) to neutral grey (1). Must stay below 1 or unsaturated pixels vanish. Default `0.45` |
| `smoothness` | Softness of the key's edge (0–1) |
| `spill` | Green-spill removal, applied to **every** pixel, not just the edge (0–1, default `0.8`) |

The console builds this link for you — see **Standalone link** in the Display
panel, which bakes in whatever avatar, voice and context are currently selected.

**This is the only mode that works on serverless hosting.** The control channel
needs one shared process; a standalone panel needs no channel at all, so it
skips it entirely rather than holding an SSE stream open against a platform that
would keep recycling it.

## Deploying it somewhere the panel can reach

To test on the device against a deployed build rather than this machine:

1. Set `LIVEAVATAR_API_KEY` in the host's environment variables.
2. Make the deployment publicly reachable. Vercel preview deployments are behind
   **Deployment Protection** by default — the panel will hit an SSO login wall
   instead of the app. Disable it for the project, or use a protection-bypass
   token.
3. Open the **standalone link** on the panel. Remote control from the console
   will not work there (see above); the panel runs itself.

Deployed over HTTPS, the microphone and the screen wake lock both work — which
they cannot do over plain `http://` on a LAN.

## Green backdrop, black panel

Some LiveAvatar avatars are delivered over a **green screen**, meant to be keyed
out — which is why an untouched feed shows a bright green box. A holographic or
transparent panel reads black as "nothing", so the backdrop has to become true
black for the avatar to appear to float.

**This is the default**, because it is what the panel is for. A plain link
already keys the backdrop and paints pure black behind it:

```
/avatar/display?avatar=<id>&context=<id>&mic=1
```

Pass `chroma=0` for the untouched feed, or `bg=` any colour to put something
else behind the avatar.

The key runs as a WebGL shader over the video, in chroma (Cb/Cr) space rather
than RGB so shadows on the backdrop and highlights on the subject key alike and
skin tones survive. The distance is **normalised against the key colour's own
chroma magnitude**, which is what makes it safe: every desaturated pixel — black
hair, a dark suit, a white shirt — sits at exactly that magnitude from the key,
so a raw threshold above it erases all of them and leaves only saturated skin.
Normalising puts neutral at a fixed 1.0, so any `similarity` below 1 keeps them.

The **key colour is sampled from the feed's top corners**, not hard-coded.
Broadcast green (`#00b140`) and pure green (`#00ff00`) are 0.77 apart on that
normalised scale, so a key tuned for one leaves the other on screen — and which
green an avatar ships on is not something to guess. If the corners aren't
saturated enough to be a chroma backdrop, nothing is keyed and the raw video is
shown, so an avatar delivered on black is left alone. Spill suppression pulls the green fringe off hair and
shoulders. If WebGL is unavailable the page falls back to the raw video rather
than showing nothing.

Tune it live from the console's **Framing** panel, or with `key`, `similarity`,
`smoothness` and `spill` in the link.

## Running chrome-free on the panel

A browser address bar above the avatar ruins a kiosk. Two things address it:

- The activation tap also requests **fullscreen**, so a normally-opened link goes
  edge to edge after one touch.
- The app ships a **web app manifest** (`display: fullscreen`, starting at
  `/avatar/display`). Using the Android browser's *Add to Home screen* and
  launching from that icon opens with no browser UI at all — the better option
  for a panel that runs all day.

## Why the panel needs a tap

The avatar's voice arrives as audio on a `<video>` element. Mobile browsers
refuse to play audio until the user has interacted with the page, so the display
shows an activation screen first. It only happens once per page load; the panel
then also takes a screen wake lock so it won't dim mid-conversation.

## How the two halves talk

The panel is a separate machine, so Mano's existing `localStorage` channel (which
only reaches other tabs in one browser) can't carry control messages. Instead:

```
/avatar  ──POST /api/avatar/command──►  in-memory broker  ──SSE──►  /avatar/display
         ◄──────────── SSE /api/avatar/channel ────────────────────┘
```

Both ends hold an SSE connection tagged with a role (`console` or `display`) and
a room name; the broker fans each message out to the *other* role only. The
display owns the HeyGen session — the video and audio have to land where the
screen and speakers are — and reports status and transcripts back up.

**This broker is per-process.** `next dev` and `next start` are a single process,
so a LAN-attached panel works. It will *not* work across serverless instances
(Vercel), where the two halves may land on different machines; that would need a
shared transport (Redis, Ably, or a LiveKit data channel).

Use different `room` values to drive more than one panel from one server.

## Knowledge

"Knowledge" is HeyGen's **context** resource: the system prompt, the opening
line, and optional knowledge links. `/avatar` → **Knowledge** is a full CRUD UI
over `/v1/contexts`.

- **A session with no context starts in restricted mode and will not answer** —
  attaching one is not optional if you want conversation.
- `${variable}` in the prompt or opening line is a dynamic variable, filled in
  per session. The editor lists the ones it detects.
- **A context that declares required variables cannot start without them** — the
  API rejects the session with `Missing dynamic variables`. Selecting such a
  context in the console reveals an input per variable and holds the Start button
  until they're filled. In a standalone link they travel as `var.<name>=<value>`.
- Contexts are independent of avatars and voices, so one context can be paired
  with different faces.
- Edits apply on the *next* session — restart to pick them up.

## Speaking

- **Talk** sends your text through the avatar's LLM, which answers using its
  context.
- **Repeat** makes the avatar say your words verbatim, with no LLM in the loop.
- **Interrupt** cuts off the current utterance.

## Microphone

The mic belongs to whichever machine renders the avatar — the panel, normally.
Browsers only grant microphone access in a **secure context**, and
`http://192.168.x.x:3000` is not one. So over plain HTTP on a LAN the avatar can
speak but never hear. To let it listen, either:

- serve Mano over HTTPS (a tunnel, or a locally-trusted certificate), or
- on the panel, add the origin to
  `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.

The console warns about this when you enable listening on an insecure origin. The
screen wake lock needs a secure context too.

## Architecture

```
app/avatar/page.tsx                 console shell (ssr: false)
app/avatar/AvatarConsoleClient.tsx  operator UI + command dispatch
app/avatar/display/                 the panel view; owns the session
app/api/heygen/status               is a key configured?
app/api/heygen/avatars              public + private avatars, merged
app/api/heygen/voices               voice library
app/api/heygen/contexts[/id]        knowledge CRUD
app/api/heygen/session              mints a session token
app/api/avatar/channel              SSE, console ↔ display
app/api/avatar/command              publish one control message
app/api/avatar/display-url          LAN URLs for the panel
src/heygen/api.ts                   server REST client — the only reader of the key
src/heygen/normalize.ts             wire snake_case ↔ app camelCase + validation
src/heygen/useAvatarSession.ts      React wrapper around LiveAvatarSession
src/heygen/protocol.ts              the console ↔ display message vocabulary
src/heygen/standalone.ts            standalone link build/parse
src/server/channel.ts               in-process pub/sub broker
src/store/avatar.ts                 operator config, persisted to localStorage
src/ui/avatar/*                     console panels and the shared video stage
```

The API key never reaches the browser. Session config (avatar, voice, language,
context) is bound to the token server-side, so a client holding a token cannot
swap in a different avatar or context.

## A note on "3D"

HeyGen streams a photoreal **2D video** of the avatar over WebRTC. It does not
emit a 3D model, skeleton, or viseme track. This integration therefore targets a
panel that *displays* that video — any depth effect comes from the hardware. A
device rendering its own 3D character would need a different approach: only the
audio could come from HeyGen, with lipsync driven separately.
