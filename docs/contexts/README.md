# Authored contexts

The live copy of a knowledge context lives in HeyGen, not here — that is where
the avatar reads it from, and `/avatar` → **Knowledge** edits it directly. These
files are the *authored* copy, kept in git so a persona has a history, a diff and
a review, which the HeyGen console gives you none of.

That means two places can change, and **HeyGen wins** — it is what the avatar
actually reads. Edit the file, push it, and the two agree. Edit in the console
and the file is stale until someone pulls it back.

## Natalie — nxT Innovation Lab (conference)

| | |
|---|---|
| Context id | `d4536e86-cf93-4abd-9648-aedceeb3b875` |
| Prompt | `natalie/prompt.md` |
| Opening line | `natalie/opening.txt` — spoken verbatim, so it is written in Spanish |

### Push the files to HeyGen

Against a deployment that has the key (no local key needed):

```bash
python3 - <<'PY'
import json, pathlib, urllib.request
host = "https://<your-deployment>"
ctx  = "d4536e86-cf93-4abd-9648-aedceeb3b875"
body = json.dumps({
    "name": "Natalie — nxT Innovation Lab (Conference)",
    "prompt": pathlib.Path("docs/contexts/natalie/prompt.md").read_text().strip(),
    "openingText": pathlib.Path("docs/contexts/natalie/opening.txt").read_text().strip(),
}).encode()
req = urllib.request.Request(f"{host}/api/heygen/contexts/{ctx}", data=body,
                             method="PATCH", headers={"content-type": "application/json"})
print(json.load(urllib.request.urlopen(req))["context"]["updatedAt"])
PY
```

### Pull HeyGen back into the files

```bash
curl -s "https://<your-deployment>/api/heygen/contexts/<id>" | python3 -c "
import json,sys,pathlib
c = json.load(sys.stdin)['context']
pathlib.Path('docs/contexts/natalie/prompt.md').write_text(c['prompt'].rstrip() + '\n')
pathlib.Path('docs/contexts/natalie/opening.txt').write_text(c['openingText'].rstrip() + '\n')
"
```

Then `git diff` shows exactly what changed in the console.

## Writing a prompt that gets spoken

Everything the avatar writes is read aloud by a speech engine, verbatim. That
makes two things matter more than they would on a page:

- **Spell for the ear, not the eye.** `nxT` is read out as three letters. The
  prompt therefore tells her to write "Next Innovation Lab" in her replies. If
  captions are switched on, the caption shows the phonetic spelling — which is
  the trade, and the reason captions are off by default on the panel.
- **Write instructions, not history.** A line like "you have already asked their
  name" tells the model that question is behind it, and it will skip the
  greeting. Say what to do, in the imperative.

## Restarting is what clears the last visitor

A context cannot make the avatar forget someone: one session is one conversation
history. See **A fresh conversation for each visitor** in `../avatar.md`.
