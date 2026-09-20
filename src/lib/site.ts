/**
 * The public address of this deployment.
 *
 * Two separate facts live here because two different layers need them and
 * neither can read the other's: `next.config.mjs` runs before any TypeScript
 * is loaded, so it re-reads the same env vars rather than importing this file.
 *
 * `SITE_HOST` is the bare hostname the short URL is served from. It is the
 * hostname the root rewrite matches on, so the conference address lands
 * straight on the speaker hub instead of the Mano stage.
 *
 * `SITE_ORIGIN` is that host as an absolute origin, which is what Next needs
 * to turn relative Open Graph and canonical paths into absolute URLs. Without
 * a `metadataBase` it resolves them against `localhost:3000` and ships that
 * to anyone who shares the link.
 */
export const SITE_HOST = process.env.NEXT_PUBLIC_SITE_HOST ?? "meet.engers.me";

export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL ?? `https://${SITE_HOST}`;
