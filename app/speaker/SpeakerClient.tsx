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
import { BrandLockup, BrandMark } from "@/ui/speaker/BrandMark";
import { PageBackdrop } from "@/ui/speaker/primitives";
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
  { id: "book", label: "Reservar un 1:1", Icon: CalendarClock },
  { id: "volunteer", label: "Ser voluntario", Icon: Users },
  { id: "feedback", label: "Comentarios", Icon: MessageSquareQuote },
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
      <PageBackdrop />

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-3">
          <BrandMark />
          <nav className="hidden items-center gap-1 text-sm text-slate-600 sm:flex">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-xl px-3 py-1.5 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {section.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5">
        <section className="pt-10 sm:pt-14">
          {/* The conference's own lockup leads the page. The header carries
              only the compact mark, which cannot show the year or tagline. */}
          <BrandLockup className="mb-7" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-700">
            2–4 de octubre · {state.settings.timeZoneLabel}
          </p>
          <h1 className="mt-3 font-display text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Mira el video,{" "}
            <span className="bg-gradient-to-r from-cyan-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              y luego elige una acción.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-base leading-relaxed text-slate-600">
            Noventa segundos de video y luego elige la opción que te corresponda:
            reserva 15–20 minutos conmigo durante el fin de semana, súbete al escenario
            durante la sesión del sábado, o cuéntame cómo fue nuestra conversación.
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
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-cyan-500 hover:shadow-md"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                  <section.Icon size={16} />
                </span>
                <span className="text-sm font-medium text-slate-900">{section.label}</span>
              </a>
            ))}
          </div>
        </section>

        <Section
          id="book"
          eyebrow="Opción uno"
          title="Reserva un 1:1"
          blurb={`De quince a veinte minutos, uno a uno, a cualquier hora que tenga libre del 2 al 4 de octubre. Elige una franja y es tuya — todas las horas son ${state.settings.timeZoneLabel}.`}
        >
          <SlotPicker state={state} onChanged={refresh} />
        </Section>

        <Section
          id="volunteer"
          eyebrow="Opción dos"
          title="Sé voluntario en la sesión del 3 de octubre"
          blurb="Cuatro de ustedes suben conmigo durante la sesión, con una quinta persona como suplente. Hace falta gente que se maneje bien con la tecnología, lleve su laptop y a la que no le importe un micrófono."
        >
          <VolunteerSignup state={state} onChanged={refresh} />
        </Section>

        <Section
          id="feedback"
          eyebrow="Opción tres"
          title="Cuéntame cómo fue"
          blurb="Cinco preguntas, alrededor de un minuto. Mejor justo después de que hablemos el 3 de octubre, cuando todavía esté fresco."
        >
          <SurveyForm open={state.settings.surveyOpen} onSubmitted={refresh} />
          <p className="mt-4 text-[11px] text-slate-500">
            ¿Lo compartes con un grupo? Mándales{" "}
            <Link
              href="/speaker/survey"
              className="text-slate-600 underline decoration-dotted underline-offset-4 hover:text-slate-900"
            >
              /speaker/survey
            </Link>{" "}
            — las mismas cinco preguntas, y nada más en la página.
          </p>
        </Section>

        <footer className="mt-20 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 text-[11px] text-slate-500">
          <span>
            2–4 de octubre de 2026 · todas las horas en {state.settings.timeZoneLabel}
          </span>
          <Link href="/speaker/host" className="transition hover:text-slate-800">
            Consola del anfitrión
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
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{blurb}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
