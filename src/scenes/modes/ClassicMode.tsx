"use client";
import { useDeckStore } from "@/store/deck";
import { Slide3D } from "../primitives/Slide3D";

export function ClassicMode() {
  const deck = useDeckStore((s) => s.deck);
  const index = useDeckStore((s) => s.index);
  if (!deck) return null;
  return (
    <group position={[0, 0, 0]}>
      {deck.slides.map((slide, i) => {
        const offset = i - index;
        const x = offset * 2.4;
        const z = -Math.abs(offset) * 0.3;
        return (
          <Slide3D
            key={slide.id}
            slide={slide}
            position={[x, 0, z]}
            rotation={[0, -offset * 0.08, 0]}
            active={offset === 0}
            scale={offset === 0 ? 1.05 : 0.85}
          />
        );
      })}
    </group>
  );
}
