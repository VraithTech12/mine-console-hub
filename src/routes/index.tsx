import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Craft Control — Minecraft Server Panel" },
      {
        name: "description",
        content: "Sign in to manage your home Minecraft Forge server from anywhere.",
      },
      { property: "og:title", content: "Craft Control — Minecraft Server Panel" },
      {
        property: "og:description",
        content: "Sign in to manage your home Minecraft Forge server from anywhere.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    void navigate({ to: session ? "/dashboard" : "/auth", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}
