"use client";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "@/store/scene";
import { useDeckStore } from "@/store/deck";
import { StageLights } from "./primitives/StageLights";
import { ClassicMode } from "./modes/ClassicMode";
import { BrainMode } from "./modes/BrainMode";
import { TimelineMode } from "./modes/TimelineMode";
import { ZoomMode } from "./modes/ZoomMode";

function CameraRig() {
  const mode = useSceneStore((s) => s.mode);
  const zoom = useSceneStore((s) => s.zoomDepth);
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 6));
  const lookAt = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    switch (mode) {
      case "classic":
        target.current.set(0, 0, 6 / zoom);
        lookAt.current.set(0, 0, 0);
        break;
      case "brain":
        target.current.set(0, 0.4, 9 / zoom);
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
  }, [mode, zoom]);

  useFrame(() => {
    camera.position.lerp(target.current, 0.35);
    const cur = new THREE.Vector3();
    camera.getWorldDirection(cur);
    const desired = lookAt.current.clone().sub(camera.position).normalize();
    cur.lerp(desired, 0.4);
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
    case "brain":
      return <BrainMode />;
    case "timeline":
      return <TimelineMode />;
    case "zoom":
      return <ZoomMode />;
    default:
      return <ClassicMode />;
  }
}

export function Stage({ audience = false }: { audience?: boolean }) {
  const dpr = useMemo(
    () => (audience ? [1, 2] : [1, 1.5]) as [number, number],
    [audience],
  );
  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 6], fov: 45, near: 0.1, far: 80 }}
      className="absolute inset-0"
    >
      <CameraRig />
      <Suspense fallback={null}>
        <StageLights />
        <ActiveMode />
      </Suspense>
    </Canvas>
  );
}
