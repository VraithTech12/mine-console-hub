import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Megaphone, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runAction, isLive, type AgentRow } from "@/lib/agent-client";

const PRESETS: { label: string; command: string }[] = [
  { label: "Make it day", command: "time set day" },
  { label: "Make it night", command: "time set night" },
  { label: "Clear weather", command: "weather clear" },
  { label: "Keep inventory on", command: "gamerule keepInventory true" },
  { label: "Peaceful mode", command: "difficulty peaceful" },
  { label: "Normal mode", command: "difficulty normal" },
  { label: "List players", command: "list" },
  { label: "Save the world", command: "save-all" },
];

export function QuickCommands({ agent }: { agent: AgentRow }) {
  const [message, setMessage] = useState("");
  const live = isLive(agent);

  const run = useMutation({
    mutationFn: (command: string) => runAction(agent, "server.command", { command }),
    onSuccess: (_data, command) => toast.success(`Sent: ${command}`),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="panel p-4 sm:p-5">
      <header className="flex items-center gap-2">
        <Sparkles className="size-4 shrink-0 text-primary" />
        <h2 className="truncate text-sm font-semibold">Quick actions</h2>
      </header>
      <p className="mt-1 text-xs text-muted-foreground">
        One-tap shortcuts for the things you do most often.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {PRESETS.map((preset) => (
          <Button
            key={preset.command}
            variant="secondary"
            size="sm"
            className="w-full justify-start sm:w-auto sm:justify-center"
            disabled={!live || run.isPending}
            onClick={() => run.mutate(preset.command)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const value = message.trim();
          if (!value) return;
          run.mutate(`say ${value}`);
          setMessage("");
        }}
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={live ? "Announce something to players…" : "Helper offline"}
          disabled={!live || run.isPending}
        />
        <Button type="submit" disabled={!live || run.isPending || !message.trim()}>
          <Megaphone className="size-4" />
          Announce
        </Button>
      </form>
    </section>
  );
}
