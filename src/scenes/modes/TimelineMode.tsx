"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { useDeckStore } from "@/store/deck";
import { Slide3D } from "../primitives/Slide3D";
import { Starfield } from "../primitives/Starfield";

export function TimelineMode() {
  const deck = useDeckStore((s) => s.deck);
  const index = useDeckStore((s) => s.index);

  const slides = useMemo(() => {
    if (!deck) return [];
    return [...deck.slides].sort((a, b) =>
      (a.timestamp ?? "").localeCompare(b.timestamp ?? ""),
    );
  }, [deck]);

  if (!deck) return null;

  const span = slides.length * 2.6;
  return (
    <group position={[-span / 2 + (index * 2.6), 0, 0]}>
      <Starfield count={400} />
      <mesh position={[span / 2 - 1.3, -1.4, -0.2]}>
        <boxGeometry args={[span, 0.02, 0.02]} />
        <meshBasicMaterial color="#60f5ff" />
      </mesh>
      {slides.map((s, i) => {
        const x = i * 2.6;
        const active = deck.slides[index]?.id === s.id;
        return (
          <group key={s.id} position={[x, 0, 0]}>
            <Slide3D
              slide={s}
              position={[0, 0.1, 0]}
              rotation={[0, 0, 0]}
              active={active}
              scale={active ? 1 : 0.7}
            />
            <mesh position={[0, -1.4, -0.2]}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshBasicMaterial color={active ? "#ffd28a" : "#60f5ff"} />
            </mesh>
            <Text
              position={[0, -1.7, 0]}
              fontSize={0.16}
              color={active ? "#ffd28a" : "#9aa3bd"}
              anchorY="top"
            >
              {s.timestamp ?? ""}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
