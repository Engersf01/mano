"use client";
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { Slide } from "@/store/deck";
import { accentToHex } from "@/lib/utils";
import { makeSlideTexture } from "./SlideTexture";

type Props = {
  slide: Slide;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  active?: boolean;
  onClick?: () => void;
  highlight?: boolean;
};

const W = 1.92;
const H = 1.08;

export function Slide3D({
  slide,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  active = false,
  highlight = false,
  onClick,
}: Props) {
  const group = useRef<THREE.Group>(null);
  const accent = accentToHex(slide.accent);

  const texture = useMemo(() => makeSlideTexture(slide), [slide]);
  useEffect(() => () => texture.dispose(), [texture]);

  const baseY = position[1];
  const seed = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.y =
      baseY + (active ? 0 : Math.sin(t * 0.6 + seed) * 0.04);
    const target = active ? scale * 1.15 : scale;
    group.current.scale.lerp(new THREE.Vector3(target, target, target), 0.2);
  });

  return (
    <group
      ref={group}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <RoundedBox args={[W, H, 0.06]} radius={0.06} smoothness={4}>
        <meshStandardMaterial
          color="#0a0e1d"
          metalness={0.3}
          roughness={0.7}
          emissive={accent}
          emissiveIntensity={highlight ? 0.18 : active ? 0.12 : 0.04}
        />
      </RoundedBox>
      <mesh position={[0, 0, 0.033]}>
        <planeGeometry args={[W - 0.05, H - 0.05]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {active && (
        <pointLight
          position={[0, 0, 0.5]}
          color={accent}
          intensity={0.8}
          distance={3}
        />
      )}
    </group>
  );
}
