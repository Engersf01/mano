import type { Metadata } from "next";

import { publicState } from "@/speaker/derive";
import { readData } from "@/server/speakerStore";
import { adminPinConfigured } from "@/server/speakerAuth";
import { SITE_ORIGIN } from "@/lib/site";
import SpeakerClient from "./SpeakerClient";

/**
 * The hub answers on two paths — `/speaker` everywhere, and `/` on the short
 * conference host, which rewrites to it. Both point at the short form as the
 * canonical one: that is the address on the slide, and the one anyone pasting
 * the link into a chat should see expand.
 *
 * Only this page declares it. `/speaker/survey` and `/speaker/host` inherit
 * the surrounding layout's metadata, and a canonical set there would wrongly
 * claim they are this page too.
 */
export const metadata: Metadata = {
  alternates: { canonical: SITE_ORIGIN },
  openGraph: {
    type: "website",
    url: SITE_ORIGIN,
    siteName: "NeumoMeet",
    locale: "es_ES",
  },
};

/** Availability and the volunteer roster both change during the event, so the
 *  shell is never cached — a stale grid books someone into a closed slot. */
export const dynamic = "force-dynamic";

/**
 * The store is read here rather than fetched from `/api/speaker/state`, so the
 * page arrives with the real grid already in it. An audience hitting this URL
 * from a slide is on conference Wi-Fi: a loading skeleton followed by a second
 * round trip is the difference between "book a time" and "come back later".
 */
export default async function SpeakerHubPage() {
  const state = publicState(await readData(), adminPinConfigured());
  return <SpeakerClient initial={state} />;
}
