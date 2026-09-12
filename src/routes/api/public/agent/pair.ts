import { createFileRoute } from "@tanstack/react-router";

/** Alias of /api/agent/pair that always bypasses site auth on published deployments. */
export const Route = createFileRoute("/api/public/agent/pair")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handlePairRequest } = await import("@/lib/pairing.server");
        return handlePairRequest(request);
      },
    },
  },
});
