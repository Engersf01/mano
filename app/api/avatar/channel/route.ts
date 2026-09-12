import { parseRole, peers, subscribe } from "@/server/channel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;

/**
 * Server-sent events stream carrying control messages to the other role in the
 * room. The comment heartbeat keeps intermediaries from closing an idle stream.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const room = params.get("room")?.trim() || "default";
  const role = parseRole(params.get("role"));

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const teardown = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed by the client going away
        }
      };

      write("retry: 2000\n\n");

      unsubscribe = subscribe(room, role, (message) => {
        write(`id: ${message.id}\nevent: message\ndata: ${JSON.stringify(message)}\n\n`);
      });

      // Sent after subscribing so the count includes this client.
      write(`event: ready\ndata: ${JSON.stringify({ room, role, peers: peers(room) })}\n\n`);

      heartbeat = setInterval(() => write(": ping\n\n"), HEARTBEAT_MS);
      req.signal.addEventListener("abort", teardown);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Tell any reverse proxy in front of us not to buffer the stream.
      "x-accel-buffering": "no",
    },
  });
}
