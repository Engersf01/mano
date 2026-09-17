import Link from "next/link";
import { readData } from "@/server/speakerStore";
import { ConferenceMark } from "@/ui/speaker/ConferenceMark";
import { SurveyForm } from "@/ui/speaker/SurveyForm";

export const dynamic = "force-dynamic";

/**
 * The short link the host hands out after a conversation.
 *
 * Nothing on this page but the five questions — no video, no booking grid, no
 * reason to scroll past the thing being asked for. Someone who got this URL
 * has already had the conversation; re-pitching the hub at them is how a
 * one-minute favour turns into a closed tab.
 */
export default async function SurveyPage() {
  const { settings } = await readData();

  return (
    <main className="relative min-h-screen pb-24">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="aurora-bg" />
      </div>

      <div className="mx-auto max-w-2xl px-5">
        <header className="flex items-center justify-between gap-4 py-5">
          <ConferenceMark />
          <Link
            href="/speaker"
            className="text-xs text-ink-400 transition hover:text-ink-100"
          >
            Speaker hub
          </Link>
        </header>

        <h1 className="mt-6 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          How did our conversation go?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-300">
          Five questions, about a minute. Honest beats kind — the two written answers
          are the ones that change the next talk.
        </p>

        <div className="mt-8">
          <SurveyForm open={settings.surveyOpen} />
        </div>
      </div>
    </main>
  );
}
