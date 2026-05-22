import dynamic from "next/dynamic";

// The deck owns the webcam, a web worker, and per-frame state, so it must be
// client-only. Disabling SSR avoids a hydration pass on something that can
// never render on the server anyway.
const Deck = dynamic(() => import("@/ui/Deck"), { ssr: false });

export default function Page() {
  return <Deck />;
}
