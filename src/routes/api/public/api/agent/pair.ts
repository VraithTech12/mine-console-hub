import { createFileRoute } from "@tanstack/react-router";

/**
 * Alias so a helper app configured with base URL `https://<host>/api/public`
 * can post to its usual `/api/agent/pair` path without hitting site auth.
 */
export const Route = createFileRoute("/api/public/api/agent/pair")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handlePairRequest } = await import("@/lib/pairing.server");
        return handlePairRequest(request);
      },
    },
  },
});
