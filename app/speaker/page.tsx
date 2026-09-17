import { publicState } from "@/speaker/derive";
import { readData } from "@/server/speakerStore";
import SpeakerClient from "./SpeakerClient";

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
  const state = publicState(await readData());
  return <SpeakerClient initial={state} />;
}
