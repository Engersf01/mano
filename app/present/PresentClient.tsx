"use client";
import { useEffect } from "react";
import { Stage } from "@/scenes/Stage";
import { ControlDock } from "@/ui/presenter/ControlDock";
import { PresenterPanel } from "@/ui/presenter/PresenterPanel";
import { CameraTile } from "@/ui/presenter/CameraTile";
import { AIPanel } from "@/ui/presenter/AIPanel";
import { Toolbox } from "@/ui/tools/Toolbox";
import { AnnotationCanvas } from "@/ui/tools/AnnotationCanvas";
import { StickyLayer } from "@/ui/tools/StickyLayer";
import { RadialMenu } from "@/ui/overlays/RadialMenu";
import { Captions } from "@/ui/overlays/Captions";
import { useDeckStore } from "@/store/deck";
import { sampleDeck } from "@/data/sampleDeck";
import { useGestureIntents } from "@/gestures/intents";

export default function PresentClient() {
  const load = useDeckStore((s) => s.load);
  const deck = useDeckStore((s) => s.deck);
  useEffect(() => {
    if (!deck) load(sampleDeck);
  }, [deck, load]);
  useGestureIntents();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-ink-950">
      <Stage />
      <AnnotationCanvas />
      <StickyLayer />
      <Captions />
      <PresenterPanel />
      <CameraTile />
      <AIPanel />
      <Toolbox />
      <ControlDock />
      <RadialMenu />
    </div>
  );
}
