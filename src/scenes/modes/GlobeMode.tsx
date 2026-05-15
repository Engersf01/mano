"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useDeckStore } from "@/store/deck";
import { Slide3D } from "../primitives/Slide3D";
import { Starfield } from "../primitives/Starfield";

const R = 2.6;

function latLngToVec3(lat: number, lng: number, r = R) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

export function GlobeMode() {
  const deck = useDeckStore((s) => s.deck);
  const index = useDeckStore((s) => s.index);
  const globe = useRef<THREE.Group>(null);

  const pins = useMemo(() => {
    if (!deck) return [];
    return deck.slides.map((s) => {
      const loc = s.location ?? { lat: 0, lng: 0, place: "" };
      const v = latLngToVec3(loc.lat, loc.lng);
      const slideOut = v.clone().normalize().multiplyScalar(R + 1.6);
      return { slide: s, pin: v, slideOut };
    });
  }, [deck]);

  useFrame((_, dt) => {
    if (!globe.current) return;
    globe.current.rotation.y += dt * 0.05;
  });

  if (!deck) return null;
  return (
    <group>
      <Starfield count={500} />
      <group ref={globe}>
        <mesh>
          <icosahedronGeometry args={[R, 3]} />
          <meshStandardMaterial
            color="#0a1530"
            emissive="#1a3a6a"
            emissiveIntensity={0.35}
            wireframe
            wireframeLinewidth={1}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[R * 0.99, 64, 64]} />
          <meshStandardMaterial
            color="#06081a"
            metalness={0.7}
            roughness={0.4}
            transparent
            opacity={0.8}
          />
        </mesh>
        {pins.map((p, i) => (
          <group key={p.slide.id}>
            <mesh position={p.pin}>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshBasicMaterial color={i === index ? "#60f5ff" : "#a570ff"} />
            </mesh>
            <line>
              <bufferGeometry
                attach="geometry"
                onUpdate={(g) => {
                  g.setFromPoints([p.pin, p.slideOut]);
                }}
              />
              <lineBasicMaterial color="#60f5ff" transparent opacity={0.4} />
            </line>
          </group>
        ))}
      </group>
      {pins.map((p, i) => (
        <Slide3D
          key={p.slide.id}
          slide={p.slide}
          position={[p.slideOut.x, p.slideOut.y, p.slideOut.z]}
          rotation={[0, -Math.atan2(p.slideOut.x, p.slideOut.z), 0]}
          active={i === index}
          scale={i === index ? 0.85 : 0.45}
        />
      ))}
    </group>
  );
}
