# Speaker hub

A public page for the **October 2–4, 2026** conference weekend: one video, and
three things an audience can do after watching it.

| Route | Who it's for | What it does |
|---|---|---|
| `/speaker` | the audience | Video, then book a 1:1, volunteer, or leave feedback |
| `/speaker/survey` | the audience | The same five questions, on their own — the link to hand out after a conversation |
| `/speaker/host` | you | Availability, bookings, volunteer roster, survey results, CSV exports |

## Setup

1. **Passcode for the host console.** In `.env.local`:

   ```bash
   SPEAKER_HOST_PASSCODE=something-long-and-not-reused
   ```

   Without it `/speaker/host` refuses to open — an empty passcode never means
   "everyone is the host".

2. **The conference logo.** Save the artwork as:

   ```
   public/brand/kn-speaker.png
   ```

   It appears in the header of all three routes. Until the file exists the
   header falls back to type rather than showing a broken image.

3. **The video.** Open `/speaker/host` → *Page settings* → paste a YouTube,
   Vimeo, or direct `.mp4`/`.webm` link. `NEXT_PUBLIC_SPEAKER_VIDEO_URL` sets
   the starting value for a fresh deployment. Anything that isn't `http(s)` is
   discarded on save — this string ends up in a `src` on a page your audience
   loads.

4. **Storage.** See below. The short version: on Vercel, set `KV_REST_API_URL`
   and `KV_REST_API_TOKEN` before you share the public link.

5. **Timezone.** Defaults to `America/New_York`, shown as "ET". Change both the
   IANA name and its short label in *Page settings* — every time on the page is
   expressed in that one zone, and the label is printed beside them so nobody
   has to guess.

## Where the data lives

Bookings, the volunteer roster and survey answers are one small JSON document.
There is no database in this project, and this feature doesn't justify adding
one, so the store picks whichever backend the deployment can honour:

- **KV over REST** (Vercel KV or Upstash) when `KV_REST_API_URL` and
  `KV_REST_API_TOKEN` are set. Plain `fetch`, no new dependency. **Use this in
  production.**
- **A JSON file** otherwise — `.data/speaker.json` by default, overridable with
  `SPEAKER_DATA_FILE`. Right for `next dev`, `next start`, and self-hosting.
  Git-ignored, because it holds real people's names and email addresses.

A file store on a serverless platform would hand every instance its own empty
`/tmp` and silently lose sign-ups, so the host console detects that combination
and says so in a banner rather than looking like it works.

## 1:1 slots

The grid runs **08:00–20:00 on all three days in 20-minute slots**, and the
host opens or closes each one. 1:1s are advertised as 15–20 minutes and the
grid is cut at the long end deliberately: a 20-minute grid can finish early,
where a 15-minute one turns every conversation that runs long into a late start
for the next person, all afternoon.

- Slots between **13:00 and 14:30 on Saturday 3 October** are the session
  itself. They are carved out of the grid and can never be opened for a 1:1.
- Out of the box, 09:00–17:00 is open on each day, so the page is usable the
  minute it deploys. Trim it in the console: *Open all*, *9–5* and *Clear* per
  day, or tap individual slots, then **Save**.
- A slot someone has already booked can't be closed from the grid — the
  attendee holds a confirmation code for it. Cancel the booking in the
  *1:1 bookings* panel first, and the slot frees up.
- Closed slots are not shown greyed-out on the public page; they're not shown
  at all. An audience doesn't need to see the shape of your weekend.

Attendees get a six-character code (no `O`/`0` or `I`/`1` in the alphabet) and a
downloadable `.ics`. Cancelling needs the code **and** the email it was booked
with, so someone who overheard a code read aloud can't cancel the meeting.

One open booking per email address; to move, cancel and rebook.

### Slot ids are wall-clock, not instants

A slot id is `<date>T<HH:MM>` — the time in the event's own zone. The host picks
"3:20 on Saturday", the attendee reads "3:20 on Saturday", and nothing in
between converts to UTC and back. This is the load-bearing decision in the
scheduler: a stored instant would make every display depend on the *viewer's*
clock, and the person in Berlin books 21:20 believing they booked 15:20.

## Volunteers

**Four go on stage during the Saturday session, with a fifth signed up as
cover.** Beyond five, sign-ups join a waitlist (ten deep) — volunteers drop out
the morning of a talk.

All three requirements are checkboxes, enforced server-side, because they are
the entire selection criteria:

- confident using technology,
- own laptop on October 3,
- comfortable speaking in front of the room.

Standing (*selected* / *backup* / *waitlist*) is **derived from sign-up order**,
never stored. Remove or withdraw anyone and everybody behind them moves up on
the next read, with no re-numbering by hand.

The public roster shows **first names only** — enough to make three-of-five
filled visible, which is what gets the fourth person to sign up, without
publishing a list of full names on a URL that gets pasted into a conference
Slack.

## Survey

Five questions: three scales (1–5 value, 1–5 clarity, 0–10 recommend) and two
written answers. Five is the whole design constraint — it's filled in on a
phone, in a hallway, right after a conversation.

Change them in `src/speaker/config.ts` (`SURVEY_QUESTIONS`). The form, the
validation, the host console's averages and the CSV columns all follow from
that list.

The host console shows an average per scale and every written answer in full.
Averaging the prose is exactly the thing that would lose the point.

## Exports

*CSV* in each panel of the host console. The passcode travels in a header, so
the file is fetched and saved from a blob rather than being a plain link —
putting it in a URL would leave it in browser history and in any proxy's logs.

Cells are quoted, embedded quotes doubled, and a leading `=`, `+`, `-` or `@` is
prefixed with an apostrophe: spreadsheets treat those as formulas, which would
turn a free-text answer from the internet into something your machine evaluates
on open.

## Changing the event

`src/speaker/config.ts` holds the event as constants — dates, the slot grid,
the session block, volunteer counts, the requirements and the survey questions.
Anything that should be changeable *during* the event — the video, the
timezone, whether a section accepts new entries — is a stored setting in the
host console instead, because editing a source file mid-conference is not a
thing anyone should have to do.
