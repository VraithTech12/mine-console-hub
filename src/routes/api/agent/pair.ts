import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/agent/pair")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handlePairRequest } = await import("@/lib/pairing.server");
        return handlePairRequest(request);
      },
    },
  },
});
