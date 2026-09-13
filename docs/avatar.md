# Avatar console

A HeyGen **LiveAvatar** session driven from this machine and rendered on an
attached Android display, plus a UI for managing what the avatar knows.

Three routes:

| Route | Runs on | Purpose |
|---|---|---|
| `/p` | the Android panel | **The short one to type.** A PIN picks which configuration opens |
| `/avatar` | your laptop | Operator console — pick the avatar, start/stop, speak, manage knowledge |
| `/avatar/display?room=<name>` | the Android panel | Full-bleed avatar video and audio, configured by query string |

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

## The panel's short URL, and PINs

A standalone link carries the whole session config in its query string, which is
fine to click and miserable to type — and the panel at a stand *is* typed into,
on a monitor's on-screen keyboard, by someone standing up. So the panel has one
short address:

```
<your-deployment>/p
```

It shows a PIN pad. The PIN does two jobs: it says **which configuration to
open**, and it keeps a passer-by from starting a session on the stand. Changing
activity is four digits instead of a new link.

### Presets

Configurations live in `src/avatar/presets.ts` — avatar, context, language,
microphone, and any framing overrides — each with a short `id`, a name and a
one-line description. The name is shown on the panel once it unlocks, so it is
obvious which one is running.

### PINs

**The PINs are not in the repository, and must not be: it is public.** They come
from one environment variable, which also means changing a PIN takes no deploy:

```
AVATAR_PINS="482199:natalie, 731044:natalie-en, 555000:natalie-quiet"
```

Each entry is `pin:preset-id`.

**With the variable unset, `/p` shows setup instructions and no keypad at all.**
A keypad that cannot open anything is a lie: it looks like the panel is refusing
the digits, when nothing was ever going to open. On Vercel a new environment
variable needs a **redeploy** before an existing deployment can see it, which is
the step that is easiest to miss — so the screen says that too, and offers a
*Check again* button.

**Give every PIN the same length.** The pad opens on the last digit, so a PIN
that is the start of a longer one fires first and the longer one can never be
typed at all — `4821` shadows `482199`, and the only symptom is one activity
silently refusing to open. The pad checks for that on load and says so, since
it is a setup mistake and this is where setup happens.

What the PIN is and is not:

- Four to eight digits. **Six or more is the sensible choice**: four digits is
  ten thousand guesses, which is nothing over HTTP.
- Every attempt costs 400 ms, right or wrong, and an instance that has seen five
  failures adds two seconds more. That turns a script from seconds into hours —
  it does not make a PIN unguessable. Serverless spreads requests over
  instances, so the counter slows an attacker rather than stopping one.
- The comparison is constant-time and every entry is walked even after a match,
  so neither the timing nor the error message says how close a guess was.
- It gates the **panel**, not the HeyGen API routes. Anyone who knows the API
  shape can still call those directly; that is a separate hole, and still open.

### Opening

**The pad opens on the last digit.** There is no submit step: as soon as the
entry is as long as a configured PIN it is tried, and the result — the panel, or
a reason — comes straight back. `Open` and `Enter` still work as a fallback.

That matters more than convenience on this hardware. The pad has a focus-catching
input precisely because, without one, a panel's keyboard drives the **browser's
address bar** instead of the page: the digits edit the URL and Enter reloads,
which looks exactly like the PIN pad ignoring everything typed at it. If keys
ever seem to go nowhere, tap the screen once — that pulls focus back.

With PINs of mixed length, one try is sent per length the entry passes through,
and a failed automatic try keeps the digits so a longer PIN can still be typed.
Same-length PINs avoid both.

Once unlocked, the panel remembers the preset in `sessionStorage`, so an
accidental reload mid-conference does not send someone hunting for the PIN.

### Making the address shorter still

Most of what gets typed is the host, not the path. In Vercel, **Project →
Settings → Domains**, add any free `*.vercel.app` subdomain — `nxt-natalie.vercel.app`
turns the panel address into `nxt-natalie.vercel.app/p`, about a quarter of the
typing. A custom domain you own is shorter again.

## Standalone panel links

A link carrying `?avatar=<id>` runs the panel on its own: it starts that session
itself on the activation tap, with no console and no control channel. This is
the long-hand form of a preset — useful for trying a configuration out before
giving it a PIN, and for anything a preset doesn't cover.

```
/avatar/display?avatar=<id>&context=<id>&voice=<id>&lang=en&mic=1
```

| Param | Meaning |
|---|---|
| `avatar` | Avatar id — **presence of this is what enables standalone mode** |
| `context` | Knowledge context id |
| `voice` | Voice id (defaults to the avatar's own) |
| `lang` | Language code, default `en`. **Validated here** — see below |
| `quality` | `low` · `medium` · `high` (default) · `very_high` |
| `mode` | `CONVERSATIONAL` (default) or `PUSH_TO_TALK` |
| `speed` | Voice rate, 0.8–1.2 |
| `mic` | `1` to listen through the panel's microphone |
| `brand` | `0` to hide the stand lockup along the bottom (**on by default**) |
| `reset` | `0` to hide the restart button in the panel's corner (**on by default**) |
| `wake` | Spoken word that starts a fresh conversation, default `natalie`. `wake=0` disables it |
| `fit` `mirror` `captions` `bg` `scale` | Framing, same meanings as the console's Framing panel (`bg` defaults to pure black) |
| `chroma` | Green-backdrop removal. **On by default** — pass `chroma=0` for the raw feed |
| `key` | Backdrop colour to remove, hex without `#`. Omit it and the colour is **sampled from the feed** — set this only if detection picks wrong |
| `similarity` | Key strength as a fraction from the key colour (0) to neutral grey (1). Must stay below 1 or unsaturated pixels vanish. Default `0.45` |
| `smoothness` | Softness of the key's edge (0–1) |
| `spill` | Green-spill removal, applied to **every** pixel, not just the edge (0–1, default `0.8`) |
| `idle` | Seconds of silence before the conversation restarts for the next visitor (default `90`, `0` disables) |

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

## Branding the panel

A lockup sits where a broadcast lower-third sits — **bottom left, lifted off the
edge** — so a viewer can see who is talking without it reading as a caption or a
watermark. Left rather than centred because centre puts it under her chin on a
portrait panel; lifted because a panel's lowest band is the first thing a bezel,
a shelf edge or someone's head cuts off.

| | |
|---|---|
| Supplied artwork | `public/brand/nxT Natalie -Logo.png` — the original, untouched |
| What the panel loads | `public/brand/nxt-natalie.png` — generated |
| Generator | `python3 scripts/brand-asset.py` |

Run the script after replacing the artwork. It does three things, all of them
mechanical, which is why they aren't a one-off edit:

- **Trims** the 3500×3500 square down to its content (2696×1545). Most of that
  square is empty, so layout percentages against it mean nothing and the padding
  pushes the lockup away from the corner it is anchored to.
- **Knocks the wordmark out to white.** The supplied logo sets "natalie" in
  near-black, which is invisible on the black a holographic panel needs — the
  badge and the cyan rule would show and the name, the whole point of a
  lower-third, would not. Only type *outside* the white badge is recoloured: the
  sketched star inside the badge is dark too, and inverting that would destroy
  it. The two are told apart by filling the badge silhouette and asking which
  side of it each dark pixel falls on. The cyan rule is left alone.
- **Shrinks** it from 1.98 MB to about 60 KB, by palette-quantizing to 256
  colours — a max per-channel error of 20 on 0.2% of pixels, on an element that
  renders about 400 px wide over conference wifi.

If the generated file is missing, the lockup falls back to type rather than
leaving a broken-image icon glowing on a black screen — the failure that
actually matters, because the panel *is* the product at a conference.

Hide it with `brand=0` in the link, or the **Show the nxT · Natalie lockup**
toggle in the console's Framing panel. It never intercepts touch, so
long-press-to-reset still works over it.

## Language, and why the link checks it

`lang` binds the session's language, which drives **speech recognition** as well
as speech. The API accepts any string here without complaint — `lang=xx` mints a
token exactly like `lang=es` does — so a typo buys a session that looks perfectly
healthy and cannot understand anyone in the room.

The link parser therefore checks it against the known codes:

- a region subtag is narrowed to its primary one, so `es-DO` and `es_DO` become
  `es` rather than being rejected;
- anything else (`sp`, the classic wrong code for Spanish) falls back to English
  **and says so on the activation screen**, which is the last moment a human is
  looking at the panel on purpose.

**Always put `lang` in the link, even for English.** An absent `lang` silently
means `en`, and that is not a visible decision: a Spanish stand once ran a whole
conversation through an English recogniser because the parameter simply wasn't
there. The avatar opened in Spanish, because the opening line is fixed text, and
drifted into English the moment the model took over — which looks like the
persona misbehaving rather than a missing query parameter. The console's link
builder now always writes it out.

There is no auto-detect: LiveAvatar's STT config exposes a provider and no
language, so one session hears one language. An avatar told to switch languages
mid-conversation will *speak* the second language fine, but keeps listening with
the first one's model. If a stand turns out to be mostly English, open a second
link with `lang=en` rather than relying on the switch.

## A fresh conversation for each visitor

**One LiveAvatar session is one conversation history.** The avatar remembers
everything said in it — the visitor's name above all — and nothing in the stream
tells it that person walked away. So a session that outlives its visitor greets
the next one *inside the last one's chat*, by the wrong name, and no amount of
prompt wording fixes that: the session has to be replaced.

Three ways to do it, all of which end the session and open a new one on the same
avatar, voice and context, so the avatar replays its opening line:

| | How | When to use it |
|---|---|---|
| **Idle timer** | Automatic after `idle` seconds of silence — 90 by default | The normal case: someone drifts off mid-conversation |
| **Button** | The small circle top right of the panel | You are standing at the stand and want it now |
| **Keyboard** | `R`, `Space` or `Enter` (and `F` restores fullscreen) | A keyboard is attached — the fastest control there is |
| **Wake word** | A visitor says *"Natalie"* after the panel has been quiet | Nobody has to touch anything: the next person just speaks |
| **Long press** | Hold anywhere on the panel for 1.5 s | Nothing else is to hand |
| **Console** | **New conversation** in the Session panel | You're driving the panel from a laptop |

The wake word only counts **after `WAKE_AFTER_SILENCE_MS` (15 s) of quiet**, and
that threshold is the whole safety of it: without it, "gracias, Natalie" said
mid-conversation would wipe the conversation it was thanking. Someone saying her
name into a panel that has been quiet is arriving, not replying. The rule lives
in `isWakeCall` in `src/heygen/idle.ts`, next to the idle one and for the same
reason — neither can be exercised in a browser without a live HeyGen session.

The panel shows *Starting a new conversation…* while it reconnects, so a restart
can't be mistaken for a frozen screen.

Why a long press rather than a button: a kiosk has no controls and shouldn't grow
any. A visible button is something a passer-by presses; a deliberate hold is
invisible to visitors and hard to trigger by accident. Brief taps are ignored —
they only restore fullscreen.

The idle timer only fires on a **live** session, never mid-utterance, and never
while a restart is already running; those conditions live in
`src/heygen/idle.ts`. Set `idle=0` (or slide **Restart after silence** to *off*)
for a session that must run untouched — a demo you're narrating yourself.

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
- Authored copies of the personas live in `docs/contexts/`, with the push and
  pull commands. HeyGen is what the avatar reads; the files are what git can
  review.
- Write the opening line as an **instruction**, not as something already done.
  A prompt saying "you have already asked their name" tells the model that
  question is behind it, and it will skip straight past the greeting.

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
app/api/avatar/preset               PIN -> preset, the panel's front door
app/p/                              the short URL and its PIN pad
src/avatar/presets.ts               the named configurations (PINs live in env)
src/heygen/api.ts                   server REST client — the only reader of the key
src/heygen/normalize.ts             wire snake_case ↔ app camelCase + validation
src/heygen/useAvatarSession.ts      React wrapper around LiveAvatarSession
src/heygen/protocol.ts              the console ↔ display message vocabulary
src/heygen/idle.ts                  when silence means the next visitor arrived
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
