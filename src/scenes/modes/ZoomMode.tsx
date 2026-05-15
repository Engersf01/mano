"use client";
import { useMemo } from "react";
import { useDeckStore } from "@/store/deck";
import { Slide3D } from "../primitives/Slide3D";
import { Starfield } from "../primitives/Starfield";

export function ZoomMode() {
  const deck = useDeckStore((s) => s.deck);
  const index = useDeckStore((s) => s.index);

  const positions = useMemo(() => {
    if (!deck) return [];
    return deck.slides.map((_, i) => {
      const layer = Math.floor(i / 4);
      const inLayer = i % 4;
      const angle = (inLayer / 4) * Math.PI * 2 + layer * 0.4;
      const r = 2.4 + layer * 1.6;
      const z = -layer * 3.5;
      return [Math.cos(angle) * r, Math.sin(angle) * r * 0.5, z] as [number, number, number];
    });
  }, [deck]);

  if (!deck) return null;
  const focal = positions[index] ?? [0, 0, 0];
  return (
    <group position={[-focal[0], -focal[1], -focal[2] - 3]}>
      <Starfield count={500} />
      {deck.slides.map((s, i) => (
        <Slide3D
          key={s.id}
          slide={s}
          position={positions[i]}
          rotation={[0, 0, 0]}
          active={i === index}
          scale={i === index ? 1.1 : 0.7}
        />
      ))}
    </group>
  );
}
