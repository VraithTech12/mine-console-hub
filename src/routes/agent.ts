import { createFileRoute } from "@tanstack/react-router";

/** wss://<host>/agent — the agent's outbound relay endpoint (PROTOCOL.md section 2). */
export const Route = createFileRoute("/agent")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if ((request.headers.get("upgrade") ?? "").toLowerCase() !== "websocket") {
          return new Response("Expected a WebSocket upgrade.", { status: 426 });
        }

        const Pair = (globalThis as unknown as { WebSocketPair?: new () => Record<string, unknown> })
          .WebSocketPair;
        if (!Pair) {
          return new Response("WebSocket relay is unavailable in this runtime.", { status: 501 });
        }

        const pair = new Pair();
        const client = pair[0] as unknown as WebSocket;
        const server = pair[1] as unknown as {
          accept: () => void;
          send: (d: string) => void;
          close: (c?: number, r?: string) => void;
          addEventListener: (t: string, cb: (e: never) => void) => void;
          readyState: number;
        };

        server.accept();

        const { handleRelaySession } = await import("@/lib/relay.server");
        void handleRelaySession(server, request).catch(() => {
          try {
            server.close(1011, "Relay error");
          } catch {
            /* ignore */
          }
        });

        return new Response(null, {
          status: 101,
          webSocket: client,
        } as ResponseInit & { webSocket: WebSocket });
      },
    },
  },
});
