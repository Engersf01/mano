"use client";
import { Environment } from "@react-three/drei";

export function StageLights() {
  return (
    <>
      <color attach="background" args={["#03040c"]} />
      <fog attach="fog" args={["#03040c", 8, 28]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[6, 8, 4]} intensity={0.6} color="#a570ff" />
      <directionalLight position={[-6, 4, -4]} intensity={0.4} color="#60f5ff" />
      <pointLight position={[0, 4, 2]} intensity={1.2} color="#ffffff" distance={14} />
      <Environment preset="night" />
    </>
  );
}
