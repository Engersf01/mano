# The short URL: `meet.engers.me`

The speaker hub is handed out at a conference — read off a slide, typed into a
phone at the back of a room, pasted into a WhatsApp group. That rules out
`mano-git-main-drf01-mecoms-projects.vercel.app/speaker`, which is 54
characters and cannot be dictated out loud at all.

`meet.engers.me` is 14 characters, says what the page is for, and needs no
path: on that hostname `/` serves the hub.

## What the repo already does

- `next.config.mjs` rewrites `/` to `/speaker` when the request's `Host` is the
  short hostname. It is a rewrite, not a redirect, so the address bar still
  reads `meet.engers.me` after the page loads. Every other hostname — the
  `vercel.app` URL, preview deployments, `localhost` — still lands on the Mano
  stage at `/`.
- `app/layout.tsx` sets `metadataBase`, and `app/speaker/page.tsx` declares
  `https://meet.engers.me` as the hub's canonical URL, so the two paths that
  reach the hub do not compete as separate pages.
- Both read the hostname from `src/lib/site.ts`, which honours
  `NEXT_PUBLIC_SITE_HOST` / `NEXT_PUBLIC_SITE_URL`. Changing the domain later
  is one environment variable, not a code change.

## What has to be done by hand, once

These two steps touch accounts the repo has no access to, and have to happen in
this order — Vercel will not issue the certificate until the DNS record
resolves.

### 1. Vercel — add the domain to the project

**Project → Settings → Domains → Add**, and enter:

```
meet.engers.me
```

Vercel will then show the DNS record it expects. Take the value from that
screen rather than from here if the two disagree: some projects are given a
per-account target instead of the shared one.

One thing to check on that screen: the live deployment is currently a *branch*
URL (`mano-git-main-…`), which means `main` may not be set as the Production
branch. If the domain page offers to attach the domain to a git branch, attach
it to `main`. Otherwise set **Settings → Git → Production Branch** to `main`
first, so the domain and the deployment everyone is already using are the same
thing.

### 2. The `engers.me` registrar — create the DNS record

At whoever holds DNS for `engers.me`, add:

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name / Host | `meet` (some panels want the full `meet.engers.me`) |
| Value / Target | `cname.vercel-dns.com` |
| TTL | the default, or 3600 |
| Proxy (Cloudflare only) | **off** — DNS only, grey cloud |

A `CNAME` is correct here because this is a subdomain, not the apex; no `A`
record and no IP address is involved. If the registrar's panel adds the zone
name for you, entering `meet.engers.me` as the host can produce
`meet.engers.me.engers.me` — enter just `meet` in that case.

Cloudflare's orange-cloud proxy has to stay off: it terminates TLS itself, and
Vercel then cannot complete the certificate challenge.

### 3. Afterwards

- Vercel issues the certificate automatically, usually within a few minutes of
  the record propagating. The domain reads **Valid Configuration** when done.
- Check `https://meet.engers.me` lands on the hub, and that
  `https://meet.engers.me/speaker/host` still opens the console.
- Update the repository's **homepage** field on GitHub to
  `https://meet.engers.me` — it is the only place the live URL is recorded.

## If it does not work

- **"Invalid Configuration" in Vercel** — the `CNAME` has not propagated yet,
  or the host ended up as `meet.engers.me.engers.me`. Check with
  `dig +short meet.engers.me`; it should return a `vercel-dns.com` name.
- **The domain loads the Mano stage, not the hub** — the rewrite matches the
  `Host` header exactly. If the domain chosen differs from `meet.engers.me`,
  set `NEXT_PUBLIC_SITE_HOST` in the Vercel project's environment variables and
  redeploy.
- **`www.meet.engers.me`** is not configured and is not needed; nobody types
  `www` in front of a subdomain.
