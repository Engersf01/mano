"use client";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useSceneStore } from "@/store/scene";
import { useDeckStore } from "@/store/deck";
import { StageLights } from "./primitives/StageLights";
import { ClassicMode } from "./modes/ClassicMode";
import { SpatialMode } from "./modes/SpatialMode";
import { BrainMode } from "./modes/BrainMode";
import { GlobeMode } from "./modes/GlobeMode";
import { TimelineMode } from "./modes/TimelineMode";
import { ZoomMode } from "./modes/ZoomMode";

function CameraRig() {
  const mode = useSceneStore((s) => s.mode);
  const zoom = useSceneStore((s) => s.zoomDepth);
  const index = useDeckStore((s) => s.index);
  const deck = useDeckStore((s) => s.deck);
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 6));
  const lookAt = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    switch (mode) {
      case "classic":
        target.current.set(0, 0, 6 / zoom);
        lookAt.current.set(0, 0, 0);
        break;
      case "spatial": {
        const pos = deck?.slides[index]?.position ?? [0, 0, 0];
        const r = 1.6 / zoom;
        const v = new THREE.Vector3(...pos).normalize().multiplyScalar(
          new THREE.Vector3(...pos).length() + r * 2,
        );
        target.current.copy(v);
        lookAt.current.set(...pos);
        break;
      }
      case "brain":
        target.current.set(0, 0.4, 9 / zoom);
        lookAt.current.set(0, 0, 0);
        break;
      case "globe":
        target.current.set(0, 1.6, 7 / zoom);
        lookAt.current.set(0, 0, 0);
        break;
      case "timeline":
        target.current.set(0, 0.4, 4 / zoom);
        lookAt.current.set(0, 0, 0);
        break;
      case "zoom":
        target.current.set(0, 0, 4 / zoom);
        lookAt.current.set(0, 0, 0);
        break;
    }
  }, [mode, zoom, index, deck]);

  useFrame(() => {
    camera.position.lerp(target.current, 0.06);
    const cur = new THREE.Vector3();
    camera.getWorldDirection(cur);
    const desired = lookAt.current.clone().sub(camera.position).normalize();
    cur.lerp(desired, 0.12);
    const look = camera.position.clone().add(cur.multiplyScalar(5));
    camera.lookAt(look);
  });
  return null;
}

function ActiveMode() {
  const mode = useSceneStore((s) => s.mode);
  switch (mode) {
    case "classic":
      return <ClassicMode />;
    case "spatial":
      return <SpatialMode />;
    case "brain":
      return <BrainMode />;
    case "globe":
      return <GlobeMode />;
    case "timeline":
      return <TimelineMode />;
    case "zoom":
      return <ZoomMode />;
    default:
      return <SpatialMode />;
  }
}

export function Stage({ audience = false }: { audience?: boolean }) {
  const dpr = useMemo(() => (audience ? [1, 2] : [1, 1.5]) as [number, number], [audience]);
  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 6], fov: 45, near: 0.1, far: 80 }}
      className="absolute inset-0"
    >
      <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={45} near={0.1} far={80} />
      <AdaptiveDpr pixelated />
      <CameraRig />
      <Suspense fallback={null}>
        <StageLights />
        <ActiveMode />
      </Suspense>
    </Canvas>
  );
}
