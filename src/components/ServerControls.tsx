import { useMutation } from "@tanstack/react-query";
import { Loader2, Play, RotateCcw, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runAction, type AgentRow, isLive } from "@/lib/agent-client";
import type { ServerState } from "@/lib/protocol";

const ACTIONS = [
  { action: "server.start", label: "Start", icon: Play, blockedWhen: ["online", "starting"] },
  { action: "server.stop", label: "Stop", icon: Square, blockedWhen: ["offline", "stopping"] },
  {
    action: "server.restart",
    label: "Restart",
    icon: RotateCcw,
    blockedWhen: ["offline", "restarting"],
  },
] as const;

export function ServerControls({
  agent,
  state,
  onDone,
}: {
  agent: AgentRow;
  state: ServerState;
  onDone: () => void;
}) {
  const run = useMutation({
    mutationFn: (action: string) => runAction(agent, action),
    onSuccess: () => {
      toast.success("Done — the server is updating.");
      onDone();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const live = isLive(agent);
  const supported = Array.isArray(agent.actions) ? agent.actions : [];

  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map(({ action, label, icon: Icon, blockedWhen }) => {
        const known = supported.length === 0 || supported.includes(action);
        const disabled =
          !live ||
          !known ||
          run.isPending ||
          (blockedWhen as readonly string[]).includes(state);
        return (
          <Button
            key={action}
            variant={action === "server.start" ? "default" : "secondary"}
            disabled={disabled}
            onClick={() => run.mutate(action)}
          >
            {run.isPending && run.variables === action ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Icon className="size-4" />
            )}
            {label}
          </Button>
        );
      })}
    </div>
  );
}
