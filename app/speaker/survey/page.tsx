import Link from "next/link";
import { readData } from "@/server/speakerStore";
import { BrandLockup, BrandMark } from "@/ui/speaker/BrandMark";
import { PageBackdrop } from "@/ui/speaker/primitives";
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
      <PageBackdrop />

      <div className="mx-auto max-w-2xl px-5">
        <header className="flex items-center justify-between gap-4 py-5">
          <BrandMark />
          <Link
            href="/speaker"
            className="text-xs text-slate-500 transition hover:text-slate-900"
          >
            Página principal
          </Link>
        </header>

        <BrandLockup className="mt-4" />

        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          ¿Cómo fue nuestra conversación?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Cinco preguntas, alrededor de un minuto. Mejor sincero que amable: las dos
          respuestas escritas son las que cambian la próxima charla.
        </p>

        <div className="mt-8">
          <SurveyForm open={settings.surveyOpen} />
        </div>
      </div>
    </main>
  );
}
