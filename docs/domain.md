# The short URL: `meet.engers.me`

The speaker hub is handed out at a conference — read off a slide, typed into a
phone at the back of a room, pasted into a WhatsApp group. That rules out
`mano-git-main-drf01-mecoms-projects.vercel.app/speaker`, which is 54
characters and cannot be dictated out loud at all.

`meet.engers.me` is 14 characters, says what the page is for, and needs no
path: on that hostname `/` serves the hub.

**Live since 2026-09-20.** The record that did it is a CNAME at Wix, `meet` →
`9287b79862646fe3.vercel-dns-016.com`, with the domain attached to this
project's Production environment. The two manual steps below are kept as the
record of how it was done, and as the procedure for any future subdomain.

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

## What had to be done by hand

These two steps touch accounts the repo has no access to, and had to happen in
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

Connect it to the **Production** environment. Production is built from `main`
and the project's production URL is `mano-nu-eight.vercel.app` — verified
2026-09-20 by checking that production serves the canonical this repo sets. So
the domain and the branch this repo merges into are the same thing, and nothing
needs changing under **Settings → Git**.

Until the DNS record below exists, Vercel will show the domain as **Invalid
Configuration**. That is expected, not an error to chase — and the warning is
where Vercel prints the exact record it wants.

### 2. Wix — create the DNS record

DNS for `engers.me` is at **Wix** (see below for why that matters). In the Wix
dashboard: **Domains → engers.me → Advanced → Edit DNS → CNAME → Add Record**.

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name / Host | `meet` (some panels want the full `meet.engers.me`) |
| Value / Target | whatever Vercel displays — this account is issued a per-account target, currently `1c2d56281bf24177.vercel-dns-016.com`, not the shared `cname.vercel-dns.com` |
| TTL | the default, or 3600 |
| Proxy (Cloudflare only) | not applicable; this zone is at Wix, see below |

A `CNAME` is correct here because this is a subdomain, not the apex; no `A`
record and no IP address is involved. If the registrar's panel adds the zone
name for you, entering `meet.engers.me` as the host can produce
`meet.engers.me.engers.me` — enter just `meet` in that case.

### 3. Afterwards

Vercel issued the certificate about a minute after the record began resolving.
Verified 2026-09-20:

| Check | Result |
|---|---|
| `https://meet.engers.me/` | the hub |
| `http://meet.engers.me/` | `308` to HTTPS |
| `/speaker/host`, `/speaker/survey` | `200` |
| `/speaker` | still reachable directly |
| `engers.me`, `www.engers.me` | unaffected |
| `mano-nu-eight.vercel.app/` | still the Mano stage |

Still outstanding: the repository's **homepage** field on GitHub still holds the
old `vercel.app` URL, and nothing in the repo can change it.

## Where this zone actually lives

Checked 2026-09-20, and worth knowing before anyone reaches for a CLI:

- **DNS for `engers.me` is hosted at Wix** — the nameservers are `ns4.wixdns.net`
  and `ns5.wixdns.net`. Vercel's CLI and API can only write records for domains
  using Vercel's own nameservers, so a record added through them would sit in the
  Vercel dashboard and never resolve. While Wix is authoritative, the Wix DNS
  editor is the only place a new record can be made.
- **The registrar is Tucows**, which is who Wix resells through. Registered
  2025-02-09, expires 2027-02-09.
- The domain carries `clientTransferProhibited` and `clientUpdateProhibited`
  registry locks. Wix lifts these from inside its own flows; they matter if a
  registrar transfer is ever attempted.
- Engers' Vercel account issues **per-account CNAME targets**, not the shared
  `cname.vercel-dns.com`. The existing `www` record points at
  `1c2d56281bf24177.vercel-dns-016.com`. Always use whatever the Vercel domain
  screen displays.

### The whole zone

It is very small, which is the main reason moving it is low-risk:

| Name | Type | Value |
|---|---|---|
| `engers.me` | A | `216.150.1.1`, `216.150.16.1` (Vercel) |
| `www.engers.me` | CNAME | `1c2d56281bf24177.vercel-dns-016.com` |

No MX, no SPF/DMARC/DKIM, no apex TXT — **no email runs on this domain**, which is
normally the thing that breaks in a nameserver migration. A sweep of 27 common
subdomain names found nothing else. That sweep is a guess-list, not a zone
transfer, so the Wix DNS panel remains the authoritative inventory: read it before
migrating.

The apex and `www` serve a *different* Vercel project from this one. Nothing here
should disturb them.

## Moving DNS to Vercel

The goal is managing every record from Vercel. That is a **nameserver change**,
not a registrar transfer — the registration can stay at Wix. Transferring the
registration as well is a separate, optional step, and it needs the two registry
locks above lifted first.

Do it as a migration, not a switch: get the records into Vercel *before* changing
the nameservers, so that whichever side a resolver is still caching, it gets the
same answer.

1. In Vercel, add `engers.me` to the account (**Domains → Add**), choosing the
   option for a domain whose nameservers are elsewhere.
2. Recreate the zone above in Vercel's DNS, and assign each name to the project
   that serves it: the apex and `www` to the project already behind them, and
   `meet` to this one. For names assigned to a project, Vercel maintains the
   records itself.
3. Only then, at Wix, change the nameservers to the pair Vercel shows
   (`ns1.vercel-dns.com` / `ns2.vercel-dns.com`). If Wix refuses, the
   `clientUpdateProhibited` lock is why.
4. Wait for propagation — usually well under an hour, up to 48 in the worst case —
   and confirm `engers.me`, `www.engers.me` and `meet.engers.me` all still resolve
   and serve. Certificates re-issue on their own.

Rolling back is pointing the nameservers back at `ns4`/`ns5.wixdns.net`, so long
as the Wix zone has not been deleted in the meantime. Leave it in place.

## If it does not work

- **"Invalid Configuration" in Vercel** — normal until the `CNAME` exists and
  propagates. After that, the usual cause is the host ending up as
  `meet.engers.me.engers.me`. Check with `dig +short meet.engers.me`; it should
  return a `vercel-dns.com` name.
- **The domain loads the Mano stage, not the hub** — the rewrite matches the
  `Host` header exactly. If the domain chosen differs from `meet.engers.me`,
  set `NEXT_PUBLIC_SITE_HOST` in the Vercel project's environment variables and
  redeploy.
- **`www.meet.engers.me`** is not configured and is not needed; nobody types
  `www` in front of a subdomain.
