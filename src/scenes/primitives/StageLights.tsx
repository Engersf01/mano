"use client";

export function StageLights() {
  return (
    <>
      <color attach="background" args={["#03040c"]} />
      <fog attach="fog" args={["#03040c", 8, 28]} />
      <hemisphereLight args={["#5a72ff", "#0a0e1d", 0.4]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[6, 8, 4]} intensity={0.7} color="#a570ff" />
      <directionalLight position={[-6, 4, -4]} intensity={0.45} color="#60f5ff" />
      <directionalLight position={[0, -3, 6]} intensity={0.2} color="#ff63d4" />
      <pointLight position={[0, 4, 2]} intensity={1.2} color="#ffffff" distance={14} />
    </>
  );
}
