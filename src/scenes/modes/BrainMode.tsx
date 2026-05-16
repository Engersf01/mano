"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useDeckStore } from "@/store/deck";
import { Slide3D } from "../primitives/Slide3D";
import { Starfield } from "../primitives/Starfield";

export function BrainMode() {
  const deck = useDeckStore((s) => s.deck);
  const index = useDeckStore((s) => s.index);
  const group = useRef<THREE.Group>(null);

  const nodes = useMemo(() => {
    if (!deck) return [];
    const n = deck.slides.length;
    return deck.slides.map((s, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 4.2;
      return {
        slide: s,
        pos: [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta) * 0.7,
          r * Math.cos(phi),
        ] as [number, number, number],
      };
    });
  }, [deck]);

  const edges = useMemo(() => {
    const lines: { id: string; geo: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = new THREE.Vector3(...nodes[i].pos);
        const b = new THREE.Vector3(...nodes[j].pos);
        if (a.distanceTo(b) < 5.5) {
          const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
          lines.push({ id: `${i}-${j}`, geo });
        }
      }
    }
    return lines;
  }, [nodes]);

  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.rotation.y += dt * 0.04;
  });

  if (!deck) return null;
  return (
    <group ref={group}>
      <Starfield count={600} />
      {edges.map((e) => (
        <line key={e.id}>
          <primitive object={e.geo} attach="geometry" />
          <lineBasicMaterial color="#60f5ff" opacity={0.18} transparent />
        </line>
      ))}
      {nodes.map((n, i) => (
        <Slide3D
          key={n.slide.id}
          slide={n.slide}
          position={n.pos}
          rotation={[0, -Math.atan2(n.pos[0], n.pos[2]), 0]}
          active={i === index}
          scale={i === index ? 0.95 : 0.55}
        />
      ))}
    </group>
  );
}
