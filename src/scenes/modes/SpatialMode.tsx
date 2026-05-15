"use client";
import { useMemo } from "react";
import { useDeckStore } from "@/store/deck";
import { Slide3D } from "../primitives/Slide3D";
import { Starfield } from "../primitives/Starfield";

export function SpatialMode() {
  const deck = useDeckStore((s) => s.deck);
  const index = useDeckStore((s) => s.index);

  const positions = useMemo(() => {
    if (!deck) return [];
    const n = deck.slides.length;
    return deck.slides.map((s, i) => {
      if (s.position) return s.position;
      const angle = (i / n) * Math.PI * 2;
      const r = 4.2;
      return [Math.cos(angle) * r, Math.sin(angle * 0.5) * 0.8, Math.sin(angle) * r] as [
        number,
        number,
        number,
      ];
    });
  }, [deck]);

  if (!deck) return null;
  return (
    <group>
      <Starfield />
      {deck.slides.map((slide, i) => (
        <Slide3D
          key={slide.id}
          slide={slide}
          position={positions[i]}
          rotation={[0, -Math.atan2(positions[i][0], positions[i][2]), 0]}
          active={i === index}
          scale={i === index ? 1.1 : 0.78}
        />
      ))}
    </group>
  );
}
