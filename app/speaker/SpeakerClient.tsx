"use client";
/**
 * The hub: one video, three things to do.
 *
 * Ordered the way the ask is made from the stage — watch this, then book time
 * with me, volunteer for Saturday, or tell me how it went. Each section is an
 * anchor so a slide can point at `#book` directly and land someone on the
 * right one.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarClock, MessageSquareQuote, Users } from "lucide-react";
import type { PublicState } from "@/speaker/types";
import { ConferenceMark } from "@/ui/speaker/ConferenceMark";
import { SlotPicker } from "@/ui/speaker/SlotPicker";
import { SurveyForm } from "@/ui/speaker/SurveyForm";
import { VideoStage } from "@/ui/speaker/VideoStage";
import { VolunteerSignup } from "@/ui/speaker/VolunteerSignup";

/**
 * How often an idle page re-reads the grid.
 *
 * Slow on purpose: the cost of a stale slot is one rejected booking with a
 * clear message, while a chatty poll across a full room is a self-inflicted
 * load test on conference Wi-Fi. Every write refreshes immediately anyway.
 */
const POLL_MS = 45_000;

const SECTIONS = [
  { id: "book", label: "Book a 1:1", Icon: CalendarClock },
  { id: "volunteer", label: "Volunteer", Icon: Users },
  { id: "feedback", label: "Feedback", Icon: MessageSquareQuote },
];

export default function SpeakerClient({ initial }: { initial: PublicState }) {
  const [state, setState] = useState(initial);
  const actions = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/speaker/state", { cache: "no-store" });
      if (!response.ok) return;
      setState((await response.json()) as PublicState);
    } catch {
      // Offline for a moment: the page keeps the state it has rather than
      // blanking out, and the next poll picks things back up.
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      // A backgrounded tab in someone's pocket has no reason to poll.
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return (
    <main className="relative min-h-screen pb-24">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="aurora-bg" />
        <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/5 bg-ink-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-3">
          <ConferenceMark />
          <nav className="hidden items-center gap-1 text-sm text-ink-200 sm:flex">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-xl px-3 py-1.5 transition hover:bg-white/5 hover:text-white"
              >
                {section.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5">
        <section className="pt-10 sm:pt-14">
          <p className="text-[11px] uppercase tracking-[0.28em] text-aurora-cyan">
            October 2–4 · {state.settings.timeZoneLabel}
          </p>
          <h1 className="mt-3 font-display text-balance text-4xl font-medium tracking-tight sm:text-5xl">
            Watch this,{" "}
            <span className="bg-gradient-to-r from-aurora-cyan via-aurora-violet to-aurora-pink bg-clip-text text-transparent">
              then take one action.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-base leading-relaxed text-ink-200">
            Three minutes of video, then pick whichever one applies to you: grab 15–20
            minutes with me over the weekend, come up on stage during the Saturday
            session, or tell me how our conversation went.
          </p>

          <div className="mt-8">
            <VideoStage
              url={state.settings.videoUrl}
              poster={state.settings.videoPoster}
              title={state.settings.videoTitle}
              onWatched={() =>
                actions.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            />
          </div>

          {/* Jump targets, on mobile too — the header nav is hidden there and
              these three cards are the whole point of the page. */}
          <div ref={actions} className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-aurora-cyan/30 hover:bg-white/[0.06]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-aurora-cyan/15 text-aurora-cyan">
                  <section.Icon size={16} />
                </span>
                <span className="text-sm font-medium text-ink-50">{section.label}</span>
              </a>
            ))}
          </div>
        </section>

        <Section
          id="book"
          eyebrow="Option one"
          title="Book a 1:1"
          blurb={`Fifteen to twenty minutes, one-on-one, any time I'm free across October 2–4. Pick a slot and it's yours — all times are ${state.settings.timeZoneLabel}.`}
        >
          <SlotPicker state={state} onChanged={refresh} />
        </Section>

        <Section
          id="volunteer"
          eyebrow="Option two"
          title="Volunteer for the October 3 session"
          blurb="Four of you come up during my session, with a fifth signed up as cover. It needs people who are comfortable with tech, have a laptop, and don't mind a microphone."
        >
          <VolunteerSignup state={state} onChanged={refresh} />
        </Section>

        <Section
          id="feedback"
          eyebrow="Option three"
          title="Tell me how it went"
          blurb="Five questions, about a minute. Best filled in right after we talk on October 3, while it's still fresh."
        >
          <SurveyForm open={state.settings.surveyOpen} onSubmitted={refresh} />
          <p className="mt-4 text-[11px] text-ink-500">
            Sharing this with a group? Send them{" "}
            <Link
              href="/speaker/survey"
              className="text-ink-300 underline decoration-dotted underline-offset-4 hover:text-white"
            >
              /speaker/survey
            </Link>{" "}
            — same five questions, nothing else on the page.
          </p>
        </Section>

        <footer className="mt-20 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-6 text-[11px] text-ink-500">
          <span>October 2–4, 2026 · all times {state.settings.timeZoneLabel}</span>
          <Link href="/speaker/host" className="transition hover:text-ink-200">
            Host console
          </Link>
        </footer>
      </div>
    </main>
  );
}

function Section({
  id,
  eyebrow,
  title,
  blurb,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    // `scroll-mt` keeps the sticky header from covering the heading it just
    // scrolled to, which otherwise looks like the anchor overshot.
    <section id={id} className="scroll-mt-20 pt-16">
      <p className="text-[11px] uppercase tracking-[0.28em] text-ink-400">{eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl font-medium tracking-tight sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-300">{blurb}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
