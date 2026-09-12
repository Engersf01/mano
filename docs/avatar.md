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
