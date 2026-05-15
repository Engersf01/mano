"use client";
import { useEffect } from "react";
import { Stage } from "@/scenes/Stage";
import { Captions } from "@/ui/overlays/Captions";
import { AnnotationCanvas } from "@/ui/tools/AnnotationCanvas";
import { StickyLayer } from "@/ui/tools/StickyLayer";
import { useDeckStore } from "@/store/deck";
import { sampleDeck } from "@/data/sampleDeck";
import { useSceneStore, type SceneMode } from "@/store/scene";

export default function AudienceClient() {
  const load = useDeckStore((s) => s.load);
  const deck = useDeckStore((s) => s.deck);
  const setHud = useSceneStore.setState;
  useEffect(() => {
    if (!deck) load(sampleDeck);
    setHud({ showHands: false });
    const sync = (e: StorageEvent) => {
      if (e.key === "mano-deck-index" && e.newValue) {
        const i = Number(e.newValue);
        if (!Number.isNaN(i)) useDeckStore.getState().goto(i);
      }
      if (e.key === "mano-mode" && e.newValue) {
        useSceneStore.getState().setMode(e.newValue as SceneMode);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [deck, load, setHud]);
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-ink-950">
      <Stage audience />
      <AnnotationCanvas />
      <StickyLayer />
      <Captions audience />
    </div>
  );
}
